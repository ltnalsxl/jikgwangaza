#!/usr/bin/env node
// 선발 예측 백테스트: 과거 각 날짜에서 그 이전 기록만 보고 향후 경기 선발을 예측해 실제와 비교한다.
// usage: node scripts/backtestRotation.mjs [--season 2026] [--from 2026-05-01] [--horizon 6] [--roster file.json]
//   --roster: crawl_kbo_register.py 결과(시즌 전체). 예측 시점 전날 엔트리만 사용한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);
const season = args.season || '2026';
const from = args.from || `${season}-05-01`;
const horizon = Number(args.horizon || 6);

// src/utils/rotation.js 는 CRA(ESM) 모듈이라 data: URL로 불러온다.
const src = fs.readFileSync(path.join(ROOT, 'src/utils/rotation.js'), 'utf8');
const rotation = await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);

const bundle = JSON.parse(
  fs.readFileSync(path.join(ROOT, `public/data/kbo_crawler_data/season-${season}.json`), 'utf8')
);

const toEntries = (games) =>
  games.flatMap((g) => {
    const home = g.teams.find((t) => t.is_home)?.name;
    const away = g.teams.find((t) => !t.is_home)?.name;
    const canceled = /취소/.test(g.game_status || '');
    // useKboData와 같은 우선순위: 라인업의 선발투수 → 예고 선발 이름
    const lineupPitcher = (team) =>
      Object.values(g.starting_lineups || {}).find((t) => t?.team_name === team)?.starting_pitcher?.name || '';
    const common = {
      gameCode: g.game_code,
      date: g.date,
      gameTime: g.game_time,
      home,
      away,
      canceled,
      gameStatus: g.game_status,
      homeStarter: lineupPitcher(home) || g.home_starter_name || '',
      awayStarter: lineupPitcher(away) || g.away_starter_name || '',
    };
    return [
      { ...common, team: home },
      { ...common, team: away },
    ];
  });

const rosterData = args.roster ? JSON.parse(fs.readFileSync(args.roster, 'utf8')) : null;
const prevDay = (d) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() - 1);
  return x.toISOString().slice(0, 10);
};

const all = toEntries(bundle);
const teams = [...new Set(all.map((g) => g.team))].filter(Boolean);
const actualOf = (g, team) => (g.home === team ? g.homeStarter : g.awayStarter);
const dates = [...new Set(all.map((g) => g.date))]
  .filter((d) => d >= from)
  .filter((d) => all.some((g) => g.date === d && g.gameStatus === '종료'))
  .sort();

const stats = Array.from({ length: horizon }, () => ({ n: 0, top1: 0, top2: 0 }));
for (const today of dates) {
  // today 이후 선발은 모르는 상태로 만든다
  const masked = all.map((g) =>
    g.date >= today ? { ...g, homeStarter: '', awayStarter: '' } : g
  );
  for (const team of teams) {
    const roster = rosterData ? rotation.rosterStatus(rosterData, team, prevDay(today)) : undefined;
    const proj = rotation.projectStarters(masked, team, today, { roster });
    const upcoming = all
      .filter((g) => g.team === team && g.date >= today && !g.canceled && g.gameStatus === '종료')
      .sort((a, b) => a.date.localeCompare(b.date));
    upcoming.slice(0, horizon).forEach((g, i) => {
      const actual = actualOf(g, team);
      const p = proj[g.gameCode];
      if (!actual || !p) return;
      stats[i].n += 1;
      if (p.pitcher === actual) stats[i].top1 += 1;
      if (p.pitcher === actual || (p.alternates || []).includes(actual)) stats[i].top2 += 1;
    });
  }
}

const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '-');
console.log(`season ${season}, from ${from}, ${dates.length} days${rosterData ? ', with roster' : ''}`);
console.log('game#  samples  top1    top1+alt');
stats.forEach((s, i) => {
  console.log(`${String(i + 1).padStart(5)}  ${String(s.n).padStart(7)}  ${pct(s.top1, s.n).padStart(6)}  ${pct(s.top2, s.n).padStart(8)}`);
});
const tot = stats.reduce((a, s) => ({ n: a.n + s.n, top1: a.top1 + s.top1, top2: a.top2 + s.top2 }), { n: 0, top1: 0, top2: 0 });
console.log(`  all  ${String(tot.n).padStart(7)}  ${pct(tot.top1, tot.n).padStart(6)}  ${pct(tot.top2, tot.n).padStart(8)}`);
