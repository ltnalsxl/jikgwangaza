import React, { useMemo, useState } from 'react';
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
  const [venueFilter, setVenueFilter] = useState('전체');
  const schedules = gameLineups
    .filter((game) => game.team === selectedTeam)
    .sort((a, b) => a.date.localeCompare(b.date));

  const filteredSchedules = schedules.filter((game) => {
    if (venueFilter === '홈') return game.home === selectedTeam;
    if (venueFilter === '원정') return game.away === selectedTeam;
    return true;
  });

  const opponentStats = useMemo(() => {
    const stats = {};
    ALL_TEAMS.forEach((team) => {
      if (team !== selectedTeam) {
        stats[team] = {
          homePlayed: 0,
          awayPlayed: 0,
          homeRemaining: 0,
          awayRemaining: 0,
        };
      }
    });

    schedules.forEach((game) => {
      const opponent = game.home === selectedTeam ? game.away : game.home;
      if (!stats[opponent]) return;
      const isHome = game.home === selectedTeam;
      const isFinished = game.gameStatus && game.gameStatus.includes('종료');
      if (isHome) {
        stats[opponent].homeRemaining += 1;
        if (isFinished) stats[opponent].homePlayed += 1;
      } else {
        stats[opponent].awayRemaining += 1;
        if (isFinished) stats[opponent].awayPlayed += 1;
      }
    });

    Object.values(stats).forEach((info) => {
      info.homeRemaining -= info.homePlayed;
      info.awayRemaining -= info.awayPlayed;
    });

    return stats;
  }, [schedules, selectedTeam]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Object.entries(opponentStats).map(([team, info]) => (
          <div
            key={team}
            className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-md p-2 text-xs"
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
            <span className="text-right">
              홈 {info.homePlayed}/{info.homePlayed + info.homeRemaining}
              <br />원정 {info.awayPlayed}/{info.awayPlayed + info.awayRemaining}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-2">
        {['전체', '홈', '원정'].map((opt) => (
          <button
            key={opt}
            onClick={() => setVenueFilter(opt)}
            className={`px-3 py-1 rounded-md text-sm border transition-colors ${
              venueFilter === opt
                ? 'bg-blue-500 text-white border-transparent'
                : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {filteredSchedules.map((game) => (
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
            <span className="ml-2 px-1 text-xs rounded bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
              {game.home === selectedTeam ? '홈' : '원정'}
            </span>
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

