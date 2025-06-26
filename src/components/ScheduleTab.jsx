import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { getTeamInfo } from '../utils/team';

const ALL_TEAMS = [
  'KIA',
  '두산',
  'LG',
  '삼성',
  '롯데',
  'SSG',
  '키움',
  '한화',
  'NC',
  'KT',
];

const ScheduleTab = ({ selectedTeam, gameLineups, formatDateKorean }) => {
  const schedules = gameLineups
    .filter((game) => game.team === selectedTeam)
    .sort((a, b) => a.date.localeCompare(b.date));

  const opponentStats = useMemo(() => {
    const stats = {};
    ALL_TEAMS.forEach((team) => {
      if (team !== selectedTeam) {
        stats[team] = { played: 0, remaining: 16 };
      }
    });

    schedules.forEach((game) => {
      const opponent = game.home === selectedTeam ? game.away : game.home;
      if (!stats[opponent]) return;
      const isFinished =
        game.gameStatus && game.gameStatus.includes('종료');
      if (isFinished) {
        stats[opponent].played += 1;
        stats[opponent].remaining = Math.max(
          16 - stats[opponent].played,
          0
        );
      }
    });

    return stats;
  }, [schedules, selectedTeam]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Object.entries(opponentStats).map(([team, info]) => (
          <div
            key={team}
            className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-md p-2 text-sm"
          >
            <div className="flex items-center gap-1">
              {getTeamInfo(team).logo && (
                <img
                  src={getTeamInfo(team).logo}
                  alt={team}
                  className="w-4 h-4 object-contain"
                />
              )}
              <span className="font-medium">{team}</span>
            </div>
            <span>
              {info.played}경기 • {info.remaining}남음
            </span>
          </div>
        ))}
      </div>
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

