// 선발 로테이션 계산 유틸
// gameLineups 항목: { team, date, gameCode, home, away, canceled, startingPitcher, awayStarter, homeStarter }

export const toLocalDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const starterFor = (game, team) => {
  if (!game) return '';
  if (game.team === team && game.startingPitcher?.playerName) {
    return game.startingPitcher.playerName;
  }
  if (game.home === team) return game.homeStarter || '';
  if (game.away === team) return game.awayStarter || '';
  return '';
};

const daysBetween = (a, b) =>
  Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);

const teamGames = (gameLineups, team) => {
  const seen = new Set();
  return gameLineups
    .filter((g) => g.team === team && !g.canceled)
    .filter((g) => {
      const key = g.gameCode || g.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => `${a.date}${a.gameTime || ''}`.localeCompare(`${b.date}${b.gameTime || ''}`));
};

/** beforeDate 이전(당일 제외) 실제 선발 등판 기록, 최신순 */
export const getRecentStarts = (gameLineups, team, beforeDate, limit = 6) => {
  const season = beforeDate.slice(0, 4);
  return teamGames(gameLineups, team)
    .filter((g) => g.date < beforeDate && g.date.startsWith(season))
    .map((g) => ({
      date: g.date,
      pitcher: starterFor(g, team),
      opponent: g.home === team ? g.away : g.home,
      isHome: g.home === team,
    }))
    .filter((s) => s.pitcher)
    .reverse()
    .slice(0, limit)
    .map((s) => ({ ...s, restDays: daysBetween(s.date, beforeDate) - 1 }));
};

export const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d);
};

// KBO 규정: 1군 말소 후 10일이 지나야 재등록 가능
export const REREGISTER_DAYS = 10;
const MIN_REST = 4;
const REST_CAP = 5;
const WORKLOAD_WINDOW = 30;
const FILL_IN = '__fill_in__';

/**
 * 팀의 투수 엔트리 정보(kboPitcherRoster.json)를 날짜 기준으로 정리한다.
 * 반환: { registered: Set|null, removed: Map<name, 말소일> }
 */
export const rosterStatus = (rosterData, team, onDate) => {
  const days = rosterData?.days || {};
  const keys = Object.keys(days).filter((d) => d <= onDate && days[d]?.[team]).sort();
  const latest = keys[keys.length - 1];
  const registered = latest ? new Set(days[latest][team]) : null;
  const removed = new Map();
  for (let i = 1; i < keys.length; i += 1) {
    const prev = new Set(days[keys[i - 1]][team]);
    const cur = new Set(days[keys[i]][team]);
    prev.forEach((p) => {
      if (!cur.has(p)) removed.set(p, keys[i]);
    });
    cur.forEach((p) => {
      if (!prev.has(p)) removed.delete(p);
    });
  }
  const fallback = rosterData?.removed?.[team];
  if (fallback && keys.length < 2) {
    Object.entries(fallback).forEach(([p, d]) => {
      if (d <= onDate && !registered?.has(p)) removed.set(p, d);
    });
  }
  return { registered, removed, asOf: latest || null };
};

/**
 * starterNews.json 의 팀 기사 목록을 예측에 쓸 힌트로 정리한다.
 *  - planned: 기사에 날짜와 함께 나온 등판 계획 (예: '나균안 27일 한화전') → 그 날 선발로 사용
 *  - out: 투수별 가장 최근 신호가 이탈(말소/부상/한 턴 거름 등)이면 그 기사 날짜
 */
export const newsHints = (articles) => {
  const planned = new Map();
  const latest = new Map();
  [...(articles || [])]
    .sort((a, b) => (a.publishedAt || '').localeCompare(b.publishedAt || ''))
    .forEach((a) => {
      Object.entries(a.plans || {}).forEach(([p, d]) => planned.set(p, { date: d, article: a }));
      Object.entries(a.signals || {}).forEach(([p, sig]) => {
        if (sig === 'out' || sig === 'return') latest.set(p, { sig, article: a });
      });
    });
  const out = new Map();
  latest.forEach(({ sig, article }, p) => {
    if (sig === 'out') out.set(p, { date: (article.publishedAt || '').slice(0, 10), article });
  });
  return { planned, out };
};

/**
 * 오늘 이후 경기들의 선발을 예측한다.
 *
 * 모델(2025·2026 시즌 백테스트로 고른 규칙):
 *  - 후보: 최근 5명의 서로 다른 선발 중 4일 이상 쉰 투수
 *  - 점수: min(휴식일, 5) → 5일 이상 쉬면 동률, 동률이면 최근 30일 선발 횟수(에이스 우선), 다음은 더 오래 쉰 투수
 *  - 1군 엔트리 정보가 있으면 말소가 확인된 투수는 재등록 가능일(말소+10일) 전까지 제외한다.
 *    그 투수 차례는 '대체 선발' 자리로 기록해 나머지 투수의 순서를 유지한다(fillIn).
 *    재등록 가능해진 로테이션 투수는 대안(복귀 후보)으로만 제시한다.
 *  - 주요 언론 기사(options.news): 날짜가 박힌 등판 계획은 그대로 반영하고,
 *    마지막 등판 이후 나온 이탈 기사가 있는 투수는 10일간 후보에서 뺀다.
 *  - 예고 선발이 있으면 그대로 쓴다. 예측은 앞 경기 예상 선발을 반영해 순서대로 이어간다.
 *
 * options.roster: rosterStatus() 결과, options.news: starterNews.json의 팀 기사 배열 (둘 다 선택)
 * 반환: { [gameCode]: { pitcher, announced, alternates: [이름], confidence: 'high'|'mid'|'low',
 *                       source: 'announced'|'news'|'model', article?, fillIn?, excluded: [{pitcher, reason}] } }
 */
export const projectStarters = (gameLineups, team, fromDate, options = {}) => {
  const games = teamGames(gameLineups, team);
  const season = fromDate.slice(0, 4);
  const history = games
    .filter((g) => g.date < fromDate && g.date.startsWith(season))
    .map((g) => ({ date: g.date, pitcher: starterFor(g, team) }))
    .filter((s) => s.pitcher);
  const roster = options.roster || null;
  const hints = newsHints(options.news);
  const lastStartOf = (p) => {
    for (let i = history.length - 1; i >= 0; i -= 1) if (history[i].pitcher === p) return history[i].date;
    return '';
  };
  const newsOut = (p, gameDate) => {
    const o = hints.out.get(p);
    if (!o) return null;
    const last = lastStartOf(p);
    if (last && last > o.date) return null; // 기사 이후 이미 다시 등판함
    return gameDate < addDays(o.date, REREGISTER_DAYS) ? o : null;
  };

  const available = (p, gameDate) => {
    if (newsOut(p, gameDate)) return false;
    if (!roster?.registered || roster.registered.has(p)) return true;
    // 말소 기록이 확인된 투수만 재등록 가능일 전까지 제외 (기록 없는 투수는 당일 콜업 가능성이 있어 유지)
    const removedOn = roster.removed.get(p);
    return !removedOn || gameDate >= addDays(removedOn, REREGISTER_DAYS);
  };

  const result = {};
  let gameIndex = 0;
  for (const g of games.filter((x) => x.date >= fromDate)) {
    const announced = starterFor(g, team);
    const key = g.gameCode || g.id;
    if (announced) {
      result[key] = {
        pitcher: announced,
        announced: true,
        alternates: [],
        confidence: 'high',
        source: 'announced',
      };
      history.push({ date: g.date, pitcher: announced });
      gameIndex += 1;
      continue;
    }

    const lastStart = new Map();
    const workload = new Map();
    history.forEach((s) => {
      lastStart.set(s.pitcher, s.date);
      if (daysBetween(s.date, g.date) <= WORKLOAD_WINDOW) {
        workload.set(s.pitcher, (workload.get(s.pitcher) || 0) + 1);
      }
    });
    const rotation = [];
    for (let i = history.length - 1; i >= 0 && rotation.length < 5; i -= 1) {
      if (!rotation.includes(history[i].pitcher)) rotation.push(history[i].pitcher);
    }
    // 말소됐다가 재등록 가능해진 로테이션 투수(최근 30일 선발 2회 이상)
    const returning = roster?.registered
      ? [...roster.removed.keys()].filter(
          (p) => !rotation.includes(p) && (workload.get(p) || 0) >= 2 && available(p, g.date)
        )
      : [];

    const rest = (p) => daysBetween(lastStart.get(p), g.date) - 1;
    const score = (p) => Math.min(rest(p), REST_CAP);
    const byScore = (a, b) =>
      score(b) - score(a) || (workload.get(b) || 0) - (workload.get(a) || 0) || rest(b) - rest(a);
    const isReal = (p) => p !== FILL_IN;
    // 전체 로테이션 순서(제외 투수 포함). 1순위가 이탈 투수면 그 자리는 대체 선발 차례로 본다.
    const order = [...rotation].sort(byScore);
    const ranked = rotation.filter((p) => isReal(p) && available(p, g.date)).sort(byScore);
    const rested = ranked.filter((p) => rest(p) >= MIN_REST);
    const pool = rested.length ? rested : ranked;
    const excluded = [...rotation, ...returning]
      .filter((p) => isReal(p) && !available(p, g.date))
      .map((p) => {
        const o = newsOut(p, g.date);
        return o
          ? { pitcher: p, reason: 'news', article: o.article }
          : { pitcher: p, reason: 'roster', since: roster?.removed.get(p) || null };
      });

    const plan = [...hints.planned.entries()].find(([, v]) => v.date === g.date)?.[0];
    if (plan && !newsOut(plan, g.date)) {
      result[key] = {
        pitcher: plan,
        announced: false,
        alternates: pool.filter((p) => p !== plan).slice(0, 1),
        confidence: 'high',
        source: 'news',
        article: hints.planned.get(plan).article,
        excluded,
      };
      history.push({ date: g.date, pitcher: plan });
      gameIndex += 1;
      continue;
    }

    if (rotation.length < 3 || !pool.length) {
      result[key] = { pitcher: '', announced: false, alternates: [], confidence: 'low', source: 'model', excluded };
      gameIndex += 1;
      continue;
    }
    const top = order.find((p) => !isReal(p) || rest(p) >= MIN_REST) || order[0];
    const fillIn = !isReal(top) || !available(top, g.date);
    const [pitcher] = pool;
    const second = pool[1] || returning.find((p) => rest(p) >= MIN_REST);
    const tied = second && pool.includes(second) && score(second) === score(pitcher);
    const confidence =
      fillIn || !rested.length || gameIndex >= 4 ? 'low' : tied || gameIndex >= 2 ? 'mid' : 'high';
    result[key] = {
      pitcher,
      announced: false,
      alternates: second ? [second] : [],
      confidence,
      source: 'model',
      restDays: rest(pitcher),
      returning: returning.includes(pitcher),
      fillIn: fillIn ? (isReal(top) ? top : true) : false,
      excluded,
    };
    // 이탈 투수 차례였다면 대체 선발이 그 자리를 채운 것으로 기록해 나머지 투수의 순서를 유지한다.
    history.push({ date: g.date, pitcher: fillIn ? FILL_IN : pitcher });
    gameIndex += 1;
  }
  return result;
};

const isScore = (v) => /^\d+$/.test(String(v ?? ''));

/**
 * 팀의 최근 종료 경기 결과(최신순). 점수가 없는 경기(취소 등)는 제외한다.
 * gameLineups는 경기마다 팀별로 두 번 들어 있으므로 gameCode로 중복을 제거한다.
 */
export function getRecentResults(gameLineups, team, limit = 10) {
  const seen = new Set();
  const games = [];
  (gameLineups || []).forEach((g) => {
    if (!g || seen.has(g.gameCode)) return;
    if (g.home !== team && g.away !== team) return;
    if (g.gameStatus !== '종료' || !isScore(g.homeScore) || !isScore(g.awayScore)) return;
    seen.add(g.gameCode);
    const isHome = g.home === team;
    const my = Number(isHome ? g.homeScore : g.awayScore);
    const opp = Number(isHome ? g.awayScore : g.homeScore);
    games.push({
      gameCode: g.gameCode,
      date: g.date,
      opponent: isHome ? g.away : g.home,
      isHome,
      myScore: my,
      oppScore: opp,
      result: my > opp ? 'W' : my < opp ? 'L' : 'D',
    });
  });
  games.sort((a, b) => b.date.localeCompare(a.date) || b.gameCode.localeCompare(a.gameCode));
  return games.slice(0, limit);
}
