// kboActiveRoster.json(KBO 선수 등록 현황)을 탐색 탭에서 쓰기 좋게 정리한다.
export const RECENT_MOVE_DAYS = 7;

const keyOf = (team, name) => `${team}|${name}`;

const daysBetween = (a, b) =>
  Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);

export const shortDate = (iso) => (iso ? `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}` : '');

/** 반환: { date, active: Set<'팀|이름'>, recentMoves: [...], lastMove: Map<'팀|이름', move> } 또는 null */
export const buildRosterIndex = (data) => {
  if (!data?.teams || !data.date) return null;
  const active = new Set();
  Object.entries(data.teams).forEach(([team, byPos]) => {
    Object.values(byPos || {}).forEach((names) => (names || []).forEach((n) => active.add(keyOf(team, n))));
  });
  const recentMoves = (data.moves || []).filter((m) => daysBetween(m.date, data.date) < RECENT_MOVE_DAYS);
  const lastMove = new Map();
  recentMoves.forEach((m) => {
    const k = keyOf(m.team, m.name);
    if (!lastMove.has(k)) lastMove.set(k, m); // moves는 최신순
  });
  return { date: data.date, active, recentMoves, lastMove };
};

export const isActive = (index, team, name) => !!index?.active.has(keyOf(team, name));

/** 선수 카드용 배지. 명단이 없으면 null */
export const rosterBadge = (index, team, name) => {
  if (!index) return null;
  const move = index.lastMove.get(keyOf(team, name));
  if (move?.type === 'up' && isActive(index, team, name)) {
    return { text: `콜업 ${shortDate(move.date)}`, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' };
  }
  if (move?.type === 'down' && !isActive(index, team, name)) {
    return { text: `말소 ${shortDate(move.date)}`, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
  }
  if (isActive(index, team, name)) {
    return { text: '1군', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' };
  }
  return { text: '1군 미등록', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' };
};
