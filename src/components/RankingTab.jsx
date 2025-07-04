import React from 'react';
import { getTeamInfo } from '../utils/team';

const RankingTab = ({ teamRanks }) => {
  const sorted = (teamRanks || [])
    .slice()
    .sort((a, b) => parseInt(a.rank) - parseInt(b.rank));

  if (sorted.length === 0) {
    return <div className="text-center text-gray-500">데이터 없음</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b dark:border-gray-700">
            <th className="px-2 py-1">팀</th>
            <th className="px-2 py-1 text-center">승</th>
            <th className="px-2 py-1 text-center">무</th>
            <th className="px-2 py-1 text-center">패</th>
            <th className="px-2 py-1 text-center">승률</th>
            <th className="px-2 py-1 text-center">게임차</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.team} className="border-b last:border-b-0 dark:border-gray-700">
              <td className="flex items-center gap-2 px-2 py-1">
                <span className="w-5 text-sm font-bold">{r.rank}</span>
                {getTeamInfo(r.team).logo && (
                  <img
                    src={getTeamInfo(r.team).logo}
                    alt={r.team}
                    className="w-5 h-5 object-contain"
                  />
                )}
                <span className="font-medium">{r.team}</span>
              </td>
              <td className="px-2 py-1 text-center">{r.wins}</td>
              <td className="px-2 py-1 text-center">{r.draws}</td>
              <td className="px-2 py-1 text-center">{r.losses}</td>
              <td className="px-2 py-1 text-center">{r.win_rate}</td>
              <td className="px-2 py-1 text-center">{r.gb}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RankingTab;
