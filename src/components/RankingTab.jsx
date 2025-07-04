import React from 'react';
import { getTeamInfo } from '../utils/team';

const RankingTab = ({ teamRanks, updatedAt }) => {
  const sorted = (teamRanks || []).slice().sort((a, b) => parseInt(a.rank) - parseInt(b.rank));

  const formatUpdateTime = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  };

  return (
    <div className="space-y-2">
      {updatedAt && (
        <div className="text-sm text-gray-500 text-right">
          업데이트: {formatUpdateTime(updatedAt)} 기준
        </div>
      )}
      {sorted.map((r) => (
        <div key={r.team} className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="w-5 text-sm font-bold">{r.rank}</span>
            {getTeamInfo(r.team).logo && (
              <img src={getTeamInfo(r.team).logo} alt={r.team} className="w-5 h-5 object-contain" />
            )}
            <span className="font-medium">{r.team}</span>
          </div>
          <div className="text-sm text-right text-gray-600 dark:text-gray-300">
            <span>{r.wins}-{r.draws}-{r.losses}</span>
            <span className="ml-2">{r.win_rate}</span>
            {r.gb !== undefined && r.gb !== null && (
              <span className="ml-2 text-xs text-gray-500">GB {r.gb}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RankingTab;
