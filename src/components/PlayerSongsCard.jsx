import React from 'react';
import { getTeamInfo, getPositionKorean } from '../utils/team';

const PlayerSongsCard = ({
  chants,
  playerSongs,
  setCurrentPlayer,
  setPlaySource,
  setShowPlayer,
  setCurrentPlayerName,
}) => {
  const openPlayer = () => {
    if (!chants || chants.length === 0) return;
    const first = chants[0];
    const idx = playerSongs.findIndex(
      (c) => c.playerName === first.playerName && c.team === first.team
    );
    setCurrentPlayer(idx !== -1 ? idx : 0);
    setPlaySource('explore');
    setCurrentPlayerName(first.playerName);
    setShowPlayer(true);
  };

  if (!chants || chants.length === 0) return null;
  const first = chants[0];

  return (
    <div
      className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 cursor-pointer"
      onClick={openPlayer}
    >
      <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{first.playerName}</h3>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
        <div className="flex items-center gap-1">
          {getTeamInfo(first.team).logo && (
            <img
              src={getTeamInfo(first.team).logo}
              alt={first.team}
              className="w-4 h-4 object-contain"
            />
          )}
          <span
            className="font-medium px-2 py-1 rounded-full text-xs"
            style={{
              backgroundColor: `${getTeamInfo(first.team).color}15`,
              color: getTeamInfo(first.team).color,
            }}
          >
            {first.team}
          </span>
        </div>
        {first.position && (
          <>
            <span className="text-gray-300">•</span>
            <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-xs">
              {getPositionKorean(first.position)}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default PlayerSongsCard;
