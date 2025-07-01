import React, { useState } from 'react';
import { Play, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { getTeamInfo, getPositionKorean } from '../utils/team';

const PlayerSongsCard = ({
  chants,
  playerSongs,
  setCurrentPlayer,
  setPlaySource,
  setShowPlayer,
  handleShare,
  setCurrentPlayerName,
}) => {
  const [expanded, setExpanded] = useState(false);
  const openPlayer = (chant) => {
    const idx = playerSongs.findIndex((c) => c.id === chant.id);
    if (idx !== -1) {
      setCurrentPlayer(idx);
      setPlaySource('explore');
      setCurrentPlayerName(chant.playerName);
      setShowPlayer(true);
    }
  };

  if (!chants || chants.length === 0) return null;
  const first = chants[0];

  return (
    <div
      className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 space-y-3 cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
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
        <div className="flex-shrink-0 mt-1">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </div>
      {expanded && (
        <div className="space-y-2">
          {chants.map((chant) => (
            <div key={chant.id} className="flex items-center gap-2">
              <button
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2 px-3 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  openPlayer(chant);
                }}
              >
                <Play className="w-4 h-4" />
                {chant.chantTitle}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare(chant);
                }}
                className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <Share2 className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerSongsCard;
