import React from 'react';
import PlayerCard from './PlayerCard';
import { RefreshCw, AlertCircle, Music, Circle, Share2 } from 'lucide-react';

const LineupTab = ({
  currentLineup,
  currentPlayer,
  playerSongs,
  selectedTeam,
  fetchJsonData,
  loading,
  error,
  getCurrentGame,
  formatDateKorean,
  handlePlayAll,
  setCurrentPlayer,
  setCurrentLineupIndex,
  setPlaySource,
  setShowPlayer,
  gameLineups,
  setSelectedDate,
  handleShareLineup,
}) => {
  const currentGame = getCurrentGame();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">오늘의 라인업</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShareLineup}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            공유하기
          </button>
          <button
            onClick={fetchJsonData}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">데이터 로드 오류: {error}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      ) : currentGame ? (
        <>
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-800">
                  {currentGame.home} vs {currentGame.away}
                </h3>
                <p className="text-sm text-blue-600">
                  {currentGame.location} • {formatDateKorean(currentGame.date)}
                </p>
                <p className="text-sm text-blue-600">
                  {currentLineup.length}개 응원가 • 총 재생시간 약 {Math.ceil(currentLineup.length * 2)}분
                </p>
              </div>
              <button
                onClick={handlePlayAll}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                전체 재생
              </button>
            </div>
          </div>

          {currentLineup.length > 0 ? (
            currentLineup.map((player, index) => (
              <PlayerCard
                key={player.id || index}
                player={player}
                index={index}
                isActive={currentPlayer === index}
                playerSongs={playerSongs}
                selectedTeam={selectedTeam}
                setCurrentPlayer={setCurrentPlayer}
                setCurrentLineupIndex={setCurrentLineupIndex}
                setPlaySource={setPlaySource}
                setShowPlayer={setShowPlayer}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>이 경기의 라인업 정보가 없습니다</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Circle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>라인업 발표 전입니다</p>
          <p className="text-sm mt-2">경기 시작 전에 라인업이 발표됩니다</p>

          <button
            onClick={() => {
              const recentGame = gameLineups
                .filter((game) => {
                  const idParts = game.id.split('_');
                  return idParts.length === 2 && idParts[1] === selectedTeam;
                })
                .sort((a, b) => {
                  const dateA = a.id.split('_')[0];
                  const dateB = b.id.split('_')[0];
                  return dateB.localeCompare(dateA);
                })[0];

              if (recentGame) {
                const recentDate = recentGame.id.split('_')[0];
                setSelectedDate(recentDate);
              }
            }}
            className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            가장 최근 라인업 보러가기
          </button>
        </div>
      )}
    </div>
  );
};

export default LineupTab;
