import React from 'react';
import { Play, Share2 } from 'lucide-react';
import { getTeamInfo, getPositionKorean } from '../utils/team';

const PlayerSongsCard = ({
  chants,
  playerSongs,
  setCurrentPlayer,
  setPlaySource,
  setShowPlayer,
  handleShare,
  setCurrentPlayerName,
  getDisplayName,
}) => {
  if (!chants || chants.length === 0) return null;
  const first = chants[0];

  const isPitcher = getPositionKorean(first.position) === '투수';

  const openPlayer = () => {
    const idx = playerSongs.findIndex(
      (c) => c.playerName === first.playerName && c.team === first.team
    );
    if (idx !== -1) {
      setCurrentPlayer(idx);
      setPlaySource('explore');
      setCurrentPlayerName(first.playerName);
      setShowPlayer(true);
    }
  };

  return (
    <div
      className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 space-y-3 cursor-pointer"
      onClick={openPlayer}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{getDisplayName ? getDisplayName(first.playerName) : first.playerName}</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
            <div className="flex items-center gap-1">
              {getTeamInfo(first.team).logo && (
                <img
                  src={getTeamInfo(first.team).logo}
                  alt={first.team}
                  className="team-logo w-4 h-4 object-contain"
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
        <div className="flex-shrink-0 mt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare(first);
            }}
            className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
          >
            <Share2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>
      {isPitcher ? (
        <div className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 rounded-xl text-center text-sm text-gray-500">
          투수는 개인 응원가가 없습니다
        </div>
      ) : (
        <button
          className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-2 px-3 rounded-xl flex items-center justify-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            openPlayer();
          }}
        >
          <Play className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-gray-900 dark:text-gray-100">응원가 재생</span>
        </button>
      )}
    </div>
  );
};

export default PlayerSongsCard;
