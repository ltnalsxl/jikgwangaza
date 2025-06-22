import React from 'react';
import { Play } from 'lucide-react';

const PlayerCard = ({
  player,
  index,
  isActive,
  playerSongs,
  selectedTeam,
  setCurrentPlayer,
  setCurrentLineupIndex,
  setPlaySource,
  setShowPlayer
}) => {
  const openPlayer = () => {
    const globalIndex = playerSongs.findIndex(
      (song) =>
        song.playerName === player.playerName && song.team === selectedTeam
    );

    if (globalIndex !== -1) {
      setCurrentPlayer(globalIndex);
    } else {
      setCurrentPlayer(0);
    }

    setCurrentLineupIndex(index);
    setPlaySource('lineup');
    setShowPlayer(true);
  };

  return (
    <div
      onClick={openPlayer}
      className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
        isActive
          ? 'border-[#005BAC] bg-blue-50 dark:bg-gray-800 shadow-lg scale-105'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
              {player.order || index + 1}
            </span>
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{player.playerName}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{player.position}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            openPlayer();
          }}
          className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors"
        >
          <Play className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
  );
};

export default PlayerCard;
