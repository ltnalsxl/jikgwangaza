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

/**
 * 오늘 이후 경기들의 선발을 예측한다.
 * 예고 선발이 있으면 그대로 쓰고, 없으면 최근 5명 로테이션 중 가장 오래 쉰 투수를 예상 선발로 둔다.
 * 반환: { [gameCode]: { pitcher, announced } }
 */
export const projectStarters = (gameLineups, team, fromDate) => {
  const games = teamGames(gameLineups, team);
  const season = fromDate.slice(0, 4);
  const history = games
    .filter((g) => g.date < fromDate && g.date.startsWith(season))
    .map((g) => ({ date: g.date, pitcher: starterFor(g, team) }))
    .filter((s) => s.pitcher);

  const result = {};
  for (const g of games.filter((x) => x.date >= fromDate)) {
    const announced = starterFor(g, team);
    let pitcher = announced;
    if (!pitcher) {
      const lastStart = new Map();
      for (const s of history) lastStart.set(s.pitcher, s.date);
      const rotation = [];
      for (let i = history.length - 1; i >= 0 && rotation.length < 5; i -= 1) {
        if (!rotation.includes(history[i].pitcher)) rotation.push(history[i].pitcher);
      }
      if (rotation.length >= 3) {
        pitcher = rotation.reduce((best, p) =>
          lastStart.get(p) < lastStart.get(best) ? p : best
        );
      }
    }
    result[g.gameCode || g.id] = { pitcher: pitcher || '', announced: !!announced };
    if (pitcher) history.push({ date: g.date, pitcher });
  }
  return result;
};
