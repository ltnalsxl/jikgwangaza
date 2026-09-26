import React from 'react';
import { getTeamInfo } from '../utils/team';

const RankingTab = ({ teamRanks, rankUpdatedAt }) => {
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

  const updatedMs = rankUpdatedAt ? new Date(rankUpdatedAt).getTime() : NaN;
  const isStale = !isNaN(updatedMs) && Date.now() - updatedMs > 36 * 60 * 60 * 1000;

  const renderLast5 = (last5) => {
    if (!last5) return null;
    return (
      <div className="flex justify-center gap-0.5">
        {last5.split('').map((r, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full ${
              r === 'W' ? 'bg-blue-500' : r === 'L' ? 'bg-red-400' : 'bg-gray-300'
            }`}
            title={r === 'W' ? '승' : r === 'L' ? '패' : '무'}
          />
        ))}
      </div>
    );
  };

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
            <th className="p-2 text-center whitespace-nowrap">최근 5</th>
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
              <td className="p-2 text-center" title={t.streak || ''}>
                {renderLast5(t.last_5)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
};

export default RankingTab;
