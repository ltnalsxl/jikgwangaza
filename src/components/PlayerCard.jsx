import React from 'react';
import { Play, Heart } from 'lucide-react';

const PlayerCard = ({
  player,
  index,
  isActive,
  playerSongs,
  selectedTeam,
  setCurrentPlayer,
  setCurrentLineupIndex,
  setPlaySource,
  setShowPlayer,
  toggleLike,
  likedSongs
}) => (
  <div
    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
      isActive
        ? 'border-[#005BAC] bg-blue-50 shadow-lg scale-105'
        : 'border-gray-200 bg-white hover:border-gray-300'
    }`}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1" onClick={() => setCurrentPlayer(index)}>
        <div className="flex items-center gap-3">
          <span className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
            {player.order || index + 1}
          </span>
          <div>
            <h3 className="font-bold text-lg">{player.playerName}</h3>
            <p className="text-gray-600 text-sm">{player.position}</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => {
            const globalIndex = playerSongs.findIndex(song =>
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
          }}
          className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors"
        >
          <Play className="w-4 h-4" />
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            toggleLike(player.id);
          }}
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              likedSongs.has(player.id) ? 'text-red-500 fill-red-500' : 'text-gray-300'
            }`}
          />
        </button>
      </div>
    </div>
  </div>
);

export default PlayerCard;
