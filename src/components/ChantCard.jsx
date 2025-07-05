import React from 'react';
import { Play, Share2, Plus } from 'lucide-react';
import { getTeamInfo, getPositionKorean } from '../utils/team';

const ChantCard = ({
  chant,
  playerSongs,
  setCurrentPlayer,
  setPlaySource,
  setShowPlayer,
  handleShare,
  setCurrentPlayerName
}) => {
  const openPlayer = () => {
    // Each song record has a unique id. If multiple songs exist for a player
    // they are stored separately. Here we simply use the first match.
    const playerIndex = playerSongs.findIndex(c => c.id === chant.id);
    if (playerIndex !== -1) {
      setCurrentPlayer(playerIndex);
      setPlaySource('explore');
      setCurrentPlayerName(chant.playerName);
      setShowPlayer(true);
    }
  };

  return (
    <div
      onClick={openPlayer}
      className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 cursor-pointer"
    >
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{chant.playerName}</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
          <div className="flex items-center gap-1">
            {getTeamInfo(chant.team).logo && (
              <img
                src={getTeamInfo(chant.team).logo}
                alt={chant.team}
                className="team-logo w-4 h-4 object-contain"
              />
            )}
            <span className="font-medium px-2 py-1 rounded-full text-xs" style={{
              backgroundColor: `${getTeamInfo(chant.team).color}15`,
              color: getTeamInfo(chant.team).color
            }}>
              {chant.team}
            </span>
          </div>
          {chant.position && (
            <>
              <span className="text-gray-300">•</span>
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-xs">
                {getPositionKorean(chant.position)}
              </span>
            </>
          )}
        </div>
      </div>

    </div>

    <div className="flex items-center gap-2">
      <button
        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
        onClick={(e) => {
          e.stopPropagation();
          openPlayer();
        }}
      >
        <Play className="w-4 h-4" />
        재생
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleShare(chant);
        }}
        className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
      >
        <Share2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
      <button
        onClick={(e) => e.stopPropagation()}
        className="p-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
      >
        <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
    </div>
  </div>
  );
};

export default ChantCard;
