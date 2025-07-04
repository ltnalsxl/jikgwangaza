import React from 'react';
import { getTeamInfo } from '../utils/team';

const formatDateTimeKorean = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}년 ${m}월 ${day}일 ${hh}시 ${mm}분`;
};

const RankingTab = ({ teamRanks, teamRankTime }) => {
  if (!Array.isArray(teamRanks) || teamRanks.length === 0) {
    return (
      <p className="text-center text-gray-500">순위 데이터를 불러올 수 없습니다.</p>
    );
  }

  return (
    <div className="space-y-1">
      {teamRankTime && (
        <p className="text-right text-xs text-gray-500">
          업데이트: {formatDateTimeKorean(teamRankTime)}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
            <th className="p-2 text-center">순위</th>
            <th className="p-2 text-left">팀</th>
            <th className="p-2 text-center">승</th>
            <th className="p-2 text-center">무</th>
            <th className="p-2 text-center">패</th>
            <th className="p-2 text-center">승률</th>
            <th className="p-2 text-center">게임차</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {teamRanks.map((t) => (
            <tr key={t.team} className="bg-white dark:bg-gray-800">
              <td className="p-2 text-center font-medium">{t.rank}</td>
              <td className="p-2">
                <div className="flex items-center gap-2">
                  {getTeamInfo(t.team).logo && (
                    <img
                      src={getTeamInfo(t.team).logo}
                      alt={t.team}
                      className="w-5 h-5 object-contain"
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
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};

export default RankingTab;
