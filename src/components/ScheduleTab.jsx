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

const ScheduleTab = ({
  selectedTeam,
  gameLineups,
  formatDateKorean,
  setSelectedDate,
  setActiveTab,
}) => {
  const [locationFilter, setLocationFilter] = useState('전체');

  const schedules = gameLineups
    .filter((game) => game.team === selectedTeam)
    .sort((a, b) => b.date.localeCompare(a.date));

  const filteredSchedules = schedules.filter((game) => {
    if (locationFilter === '홈') return game.home === selectedTeam;
    if (locationFilter === '원정') return game.away === selectedTeam;
    return true;
  });

  const opponentStats = useMemo(() => {
    const perTeamTotal = locationFilter === '전체' ? 16 : 8;
    const stats = {};
    ALL_TEAMS.forEach((team) => {
      if (team !== selectedTeam) {
        stats[team] = { played: 0, remaining: perTeamTotal };
      }
    });

    filteredSchedules.forEach((game) => {
      const opponent = game.home === selectedTeam ? game.away : game.home;
      if (!stats[opponent]) return;
      const isFinished =
        !game.canceled && game.gameStatus && game.gameStatus.includes('종료');
      if (isFinished) {
        stats[opponent].played += 1;
        stats[opponent].remaining = Math.max(
          perTeamTotal - stats[opponent].played,
          0
        );
      }
    });

    return stats;
  }, [filteredSchedules, selectedTeam, locationFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {['전체', '홈', '원정'].map((opt) => (
          <button
            key={opt}
            onClick={() => setLocationFilter(opt)}
            className={`bg-white border px-3 py-1 rounded-lg text-xs font-medium text-gray-900 ${
              locationFilter === opt
                ? 'ring-2 ring-blue-500 border-transparent'
                : 'border-gray-200'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
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
      {filteredSchedules.map((game) => {
        const isCanceled =
          game.canceled || (game.gameStatus && game.gameStatus.includes('취소'));
        return (
          <div
            key={game.id}
            onClick={() => { if (setSelectedDate) setSelectedDate(game.date); if (setActiveTab) setActiveTab("lineup"); }}
            className={`cursor-pointer flex items-center justify-between rounded-lg p-3 shadow ${
              isCanceled
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 line-through'
                : 'bg-white dark:bg-gray-700'
            }`}
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
              <span className="text-xs text-gray-500">(원정)</span>
              <span className="mx-1 text-gray-500">vs</span>
              {getTeamInfo(game.home).logo && (
                <img
                  src={getTeamInfo(game.home).logo}
                  alt={game.home}
                  className="w-5 h-5 object-contain"
                />
              )}
              <span className="font-medium">{game.home}</span>
              <span className="text-xs text-gray-500">(홈)</span>
            </div>
            <div className="text-sm text-right text-gray-600 dark:text-gray-300">
              <div>{game.gameTime || '미정'}</div>
              <div>
                {formatDateKorean(game.date)}
                {game.gameStatus ? ` • ${game.gameStatus}` : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ScheduleTab;

