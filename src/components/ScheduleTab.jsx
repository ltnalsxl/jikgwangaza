import React from 'react';
import { Calendar } from 'lucide-react';
import { getTeamInfo } from '../utils/team';

const ScheduleTab = ({ selectedTeam, gameLineups, formatDateKorean }) => {
  const schedules = gameLineups
    .filter((game) => game.team === selectedTeam)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-3">
      {schedules.map((game) => (
        <div
          key={game.id}
          className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg p-3 shadow"
        >
          <div className="flex items-center gap-2">
            {getTeamInfo(game.away).logo && (
              <img
                src={getTeamInfo(game.away).logo}
                alt={game.away}
                className="w-5 h-5 object-contain"
              />
            )}
            <span className="font-medium">{game.away}</span>
            <span className="mx-1 text-gray-500">vs</span>
            {getTeamInfo(game.home).logo && (
              <img
                src={getTeamInfo(game.home).logo}
                alt={game.home}
                className="w-5 h-5 object-contain"
              />
            )}
            <span className="font-medium">{game.home}</span>
          </div>
          <div className="text-sm text-right text-gray-600 dark:text-gray-300">
            <div>{game.gameTime || '미정'}</div>
            <div>
              {formatDateKorean(game.date)}
              {game.gameStatus ? ` • ${game.gameStatus}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ScheduleTab;

