import React from 'react';
import { getTeamInfo } from '../utils/team';

const RankingTab = ({ teamRanks }) => {
  const sorted = (teamRanks || [])
    .slice()
    .sort((a, b) => parseInt(a.rank) - parseInt(b.rank));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-2 py-1 font-semibold">#</th>
            <th className="px-2 py-1 font-semibold">팀</th>
            <th className="px-2 py-1 font-semibold text-right">승-무-패</th>
            <th className="px-2 py-1 font-semibold text-right">승률</th>
            <th className="px-2 py-1 font-semibold text-right">GB</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.team}
              className="border-b last:border-b-0 border-gray-200 dark:border-gray-700"
            >
              <td className="px-2 py-1">{r.rank}</td>
              <td className="px-2 py-1">
                <div className="flex items-center gap-2">
                  {getTeamInfo(r.team).logo && (
                    <img
                      src={getTeamInfo(r.team).logo}
                      alt={r.team}
                      className="w-5 h-5 object-contain"
                    />
                  )}
                  <span className="font-medium">{r.team}</span>
                </div>
              </td>
              <td className="px-2 py-1 text-right">
                {r.wins}-{r.draws}-{r.losses}
              </td>
              <td className="px-2 py-1 text-right">{r.win_rate}</td>
              <td className="px-2 py-1 text-right">
                {r.gb !== undefined && r.gb !== null ? r.gb : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RankingTab;
