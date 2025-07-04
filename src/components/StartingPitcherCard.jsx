import React from 'react';

const StartingPitcherCard = ({
  pitcher,
  playerSongs,
  selectedTeam,
  setCurrentPlayer,
  setPlaySource,
  setShowPlayer,
  setCurrentPlayerName,
}) => {
  if (!pitcher) return null;
  const openPlayer = () => {
    const idx = playerSongs.findIndex(
      (song) => song.playerName === pitcher.playerName && song.team === selectedTeam
    );
    if (idx !== -1) {
      setCurrentPlayer(idx);
      setPlaySource('explore');
      setCurrentPlayerName(pitcher.playerName);
      setShowPlayer(true);
    }
  };

  return (
    <div
      onClick={openPlayer}
      className="p-4 rounded-xl border-2 transition-all cursor-pointer border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900 hover:border-blue-300 dark:hover:border-blue-600 mb-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
            {pitcher.playerName}
          </h3>
          {pitcher.throwingHand && (
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {pitcher.throwingHand}
            </p>
          )}
        </div>
        <span className="bg-blue-500 text-white text-xs font-medium px-2 py-1 rounded-full">
          선발투수
        </span>
      </div>
    </div>
  );
};

export default StartingPitcherCard;
