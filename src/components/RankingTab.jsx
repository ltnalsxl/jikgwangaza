import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getTeamInfo } from '../utils/team';
import { getRecentResults } from '../utils/rotation';

const RESULT_LABEL = { W: '승', L: '패', D: '무' };
const RESULT_STYLE = {
  W: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  L: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300',
  D: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const summarize = (games) => {
  const w = games.filter((g) => g.result === 'W').length;
  const l = games.filter((g) => g.result === 'L').length;
  const d = games.filter((g) => g.result === 'D').length;
  return `${w}승${d ? ` ${d}무` : ''} ${l}패`;
};

const RankingTab = ({ teamRanks, rankUpdatedAt, latestFinishedGameDate, gameLineups }) => {
  const [openTeam, setOpenTeam] = useState(null);
  const recentByTeam = useMemo(() => {
    const map = {};
    (teamRanks || []).forEach((t) => {
      map[t.team] = getRecentResults(gameLineups, t.team, 10);
    });
    return map;
  }, [teamRanks, gameLineups]);

  if (!Array.isArray(teamRanks) || teamRanks.length === 0) {
    return (
      <p className="text-center text-gray-500 dark:text-gray-400">순위 데이터를 불러올 수 없습니다.</p>
    );
  }

  const formatUpdatedAt = (iso) => {
    try {
      const d = new Date(iso);
      if (isNaN(d)) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}년 ${m}월 ${day}일 ${h}시 ${min}분`;
    } catch (e) {
      return '';
    }
  };

  // 크롤러는 순위가 바뀔 때만 파일을 쓰므로, "마지막 종료 경기 다음날 새벽"까지 반영되지 않았을 때만 지연으로 본다.
  const updatedMs = rankUpdatedAt ? new Date(rankUpdatedAt).getTime() : NaN;
  const lastGameMs = latestFinishedGameDate
    ? new Date(`${latestFinishedGameDate}T23:59:00+09:00`).getTime()
    : NaN;
  const isStale =
    !isNaN(updatedMs) &&
    !isNaN(lastGameMs) &&
    updatedMs < lastGameMs - 3 * 60 * 60 * 1000 &&
    Date.now() > lastGameMs + 6 * 60 * 60 * 1000;

  return (
    <div className="space-y-2">
      {rankUpdatedAt && (
        <p
          className={`text-right text-xs ${
            isStale ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {formatUpdatedAt(rankUpdatedAt)} 기준{isStale ? ' · 업데이트 지연 중' : ''}
        </p>
      )}
      <div className="flex justify-center">
        <table className="w-full max-w-[480px] text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
            <th className="p-2 text-center whitespace-nowrap">순위</th>
            <th className="p-2 text-center whitespace-nowrap">팀</th>
            <th className="p-2 text-center whitespace-nowrap">승</th>
            <th className="p-2 text-center whitespace-nowrap">무</th>
            <th className="p-2 text-center whitespace-nowrap">패</th>
            <th className="p-2 text-center whitespace-nowrap">승률</th>
            <th className="p-2 text-center whitespace-nowrap">게임차</th>
            <th className="p-2 text-center whitespace-nowrap">최근 10경기</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {teamRanks.map((t) => (
            <tr key={t.team} className="bg-white dark:bg-gray-800">
              <td className="p-2 text-center font-medium">{t.rank}</td>
              <td className="p-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  {getTeamInfo(t.team).logo && (
                    <img
                      src={getTeamInfo(t.team).logo}
                      alt={t.team}
                      className="team-logo w-5 h-5 object-contain"
                    />
                  )}
                  <span>{t.team}</span>
                </div>
              </td>
              <td className="p-2 text-center">{t.wins}</td>
              <td className="p-2 text-center">{t.draws}</td>
              <td className="p-2 text-center">{t.losses}</td>
              <td className="p-2 text-center">{t.win_rate}</td>
              <td className="p-2 text-center">{t.gb}</td>
              <td className="p-2 text-center">
                {recentByTeam[t.team]?.length ? (
                  <button
                    type="button"
                    onClick={() => setOpenTeam(t.team)}
                    className="whitespace-nowrap underline decoration-dotted underline-offset-2 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {summarize(recentByTeam[t.team])}
                  </button>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
      {openTeam && (
        <RecentGamesModal
          team={openTeam}
          games={recentByTeam[openTeam] || []}
          streak={teamRanks.find((t) => t.team === openTeam)?.streak}
          onClose={() => setOpenTeam(null)}
        />
      )}
  </div>
  );
};

const formatGameDate = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d)) return dateStr;
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}(${days[d.getDay()]})`;
};

const RecentGamesModal = ({ team, games, streak, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      className="bg-white dark:bg-gray-800 rounded-xl m-4 p-4 w-full max-w-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold text-lg flex items-center gap-2">
          {getTeamInfo(team).logo && (
            <img src={getTeamInfo(team).logo} alt={team} className="team-logo w-6 h-6 object-contain" />
          )}
          {team} 최근 {games.length}경기
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="닫기">
          <X className="w-5 h-5" />
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        {summarize(games)}
        {streak ? ` · 현재 ${streak}` : ''}
      </p>
      <ul className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
        {games.map((g) => (
          <li key={g.gameCode} className="flex items-center gap-3 py-2">
            <span className={`w-7 text-center rounded font-semibold text-xs py-0.5 ${RESULT_STYLE[g.result]}`}>
              {RESULT_LABEL[g.result]}
            </span>
            <span className="w-16 text-gray-500 dark:text-gray-400">{formatGameDate(g.date)}</span>
            <span className="flex-1 flex items-center gap-1.5">
              <span className="text-xs text-gray-400">{g.isHome ? '홈' : '원정'}</span>
              vs
              {getTeamInfo(g.opponent).logo && (
                <img
                  src={getTeamInfo(g.opponent).logo}
                  alt={g.opponent}
                  className="team-logo w-4 h-4 object-contain"
                />
              )}
              {g.opponent}
            </span>
            <span className="font-medium tabular-nums">
              {g.myScore} : {g.oppScore}
            </span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export default RankingTab;
