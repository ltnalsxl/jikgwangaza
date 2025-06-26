import React from 'react';
import PlayerCard from './PlayerCard';
import { RefreshCw, AlertCircle, Music, Circle, Share2 } from 'lucide-react';
import { getTeamInfo } from '../utils/team';

const LineupTab = ({
  currentLineup,
  currentPlayer,
  playerSongs,
  selectedTeam,
  selectedDate,
  selectedGameCode,
  setSelectedGameCode,
  availableGames,
  fetchJsonData,
  loading,
  error,
  getCurrentGame,
  formatDateKorean,
  setCurrentPlayer,
  setCurrentLineupIndex,
  setPlaySource,
  setShowPlayer,
  setCurrentPlayerName,
  gameLineups,
  setSelectedDate,
  handleShareLineup,
}) => {
  const currentGame = getCurrentGame();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">오늘의 라인업</h2>
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

      {availableGames && availableGames.length > 1 && (
        <div className="mb-2">
          <select
            value={selectedGameCode || availableGames[0].gameCode}
            onChange={(e) => setSelectedGameCode(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            {availableGames.map((g) => (
              <option key={g.gameCode} value={g.gameCode}>
                {g.gameTime || g.gameCode}
              </option>
            ))}
          </select>
        </div>
      )}

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
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getTeamInfo(currentGame.away).logo && (
                    <img
                      src={getTeamInfo(currentGame.away).logo}
                      alt={currentGame.away}
                      className="w-5 h-5 object-contain"
                    />
                  )}
                  <span className="font-semibold">{currentGame.away}</span>
                  <span className="text-xs text-gray-500">(원정)</span>
                  <span className="mx-1 text-gray-500">vs</span>
                  {getTeamInfo(currentGame.home).logo && (
                    <img
                      src={getTeamInfo(currentGame.home).logo}
                      alt={currentGame.home}
                      className="w-5 h-5 object-contain"
                    />
                  )}
                  <span className="font-semibold">{currentGame.home}</span>
                  <span className="text-xs text-gray-500">(홈)</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {currentGame.location} • {formatDateKorean(currentGame.date)}
                  {currentGame.gameStatus && ` • ${currentGame.gameStatus}`}
                </p>
              </div>
            </div>
          </div>

          {currentGame.canceled ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>이 경기는 취소되었습니다</p>
            </div>
          ) : currentLineup.length > 0 ? (
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
                setCurrentPlayerName={setCurrentPlayerName}
              />
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
              {(() => {
                const selected = new Date(selectedDate);
                const today = new Date();
                const isToday =
                  selected.toDateString() === today.toDateString();
                if (isToday) {
                  return (
                    <>
                      <p>오늘 라인업이 아직 올라오지 않았습니다</p>
                      <p className="text-sm mt-2">최근 라인업 보러가실래요?</p>
                    </>
                  );
                }
                return <p>라인업 정보가 없습니다</p>;
              })()}
              <button
                onClick={() => {
                  const recentGame = gameLineups
                    .filter((game) => {
                      const idParts = game.id.split('_');
                      return idParts.length >= 3 && idParts[2] === selectedTeam;
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
                최근 라인업 보러가기
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Circle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          {(() => {
            const selected = new Date(selectedDate);
            const today = new Date();
            const isToday =
              selected.toDateString() === today.toDateString();
            const isPast = selected < new Date(today.toDateString());
            const isMonday = selected.getDay() === 1;
            if (isMonday) {
              return (
                <>
                  <p>월요일은 야구없는날!</p>
                  <p className="text-sm mt-2">최근 라인업 보러가실래요?</p>
                </>
              );
            }
            if (isPast) {
              return (
                <>
                  <p>이날은 경기가 없었습니다</p>
                  <p className="text-sm mt-2">최근 라인업을 확인해 보세요</p>
                </>
              );
            }
            if (isToday) {
              return (
                <>
                  <p>오늘 라인업이 아직 올라오지 않았습니다</p>
                  <p className="text-sm mt-2">잠시 후 다시 확인해주세요</p>
                </>
              );
            }
            return (
              <>
                <p>라인업 발표 전입니다</p>
                <p className="text-sm mt-2">경기 시작 전에 라인업이 발표됩니다</p>
              </>
            );
          })()}

          <button
            onClick={() => {
              const recentGame = gameLineups
                .filter((game) => {
                  const idParts = game.id.split('_');
                  return idParts.length >= 3 && idParts[2] === selectedTeam;
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
            최근 라인업 보러가기
          </button>
        </div>
      )}
    </div>
  );
};

export default LineupTab;
