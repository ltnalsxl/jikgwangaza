import React, { useState } from 'react';
import PlayerCard from './PlayerCard';
import StartingPitcherCard from './StartingPitcherCard';
import { RefreshCw, AlertCircle, Music, Circle, Share2, CloudSun } from 'lucide-react';
import BallparkWeather from './BallparkWeather';
import BallparkWeatherModal from './BallparkWeatherModal';
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
  teamRanks,
  getDisplayName,
  allStarData,
  ballparkForecast,
}) => {
  const currentGame = getCurrentGame();
  const [allStarTeam, setAllStarTeam] = useState('dream');
  const [showWeather, setShowWeather] = useState(false);
  const isAllStarDay = selectedDate === '2025-07-12';
  const getRank = (team) => {
    const r = teamRanks?.find((t) => t.team === team);
    return r ? `${r.rank}위` : '';
  };

  const isWeatherToday =
    ballparkForecast?.updatedAt &&
    new Date(ballparkForecast.updatedAt).toDateString() ===
      new Date().toDateString();

  const isSelectedDateToday =
    new Date(selectedDate).toDateString() === new Date().toDateString();

  const forecast =
    currentGame &&
    ballparkForecast?.data &&
    isWeatherToday &&
    isSelectedDateToday
      ? ballparkForecast.data.find((f) =>
          f.team.includes(getTeamInfo(currentGame.home).fullNameEn)
        )
      : null;

  const renderAllStarSection = (title, items) => (
    <div className="mb-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      <ul className="space-y-1">
        {items.map((p, idx) => (
          <li
            key={`${title}_${idx}`}
            className="flex justify-between border-b pb-1 text-sm"
          >
            <span>
              {p.position || p.role}
              {p.role && p.position ? `(${p.position})` : ''}
            </span>
            <span>{p.playerName || p.name}</span>
            <span className="text-gray-500">{p.team}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  if (isAllStarDay) {
    if (!allStarData) {
      return <p className="text-center py-8">올스타전 데이터가 없습니다.</p>;
    }

    const roster =
      allStarTeam === 'dream' ? allStarData.dream : allStarData.nanum;
    const teamLabel = allStarTeam === 'dream' ? '드림 올스타' : '나눔 올스타';

    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setAllStarTeam('dream')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              allStarTeam === 'dream'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200'
            }`}
          >
            드림
          </button>
          <button
            onClick={() => setAllStarTeam('nanum')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              allStarTeam === 'nanum'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200'
            }`}
          >
            나눔
          </button>
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          2025 KBO 올스타전 {teamLabel}
        </h2>
        {renderAllStarSection('BEST 12', roster.best)}
        {renderAllStarSection('감독 추천선수', roster.coachPicks)}
        {renderAllStarSection(
          '올스타 코칭스태프',
          roster.coaches.map((c) => ({ ...c }))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">오늘의 라인업</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShareLineup}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            공유하기
          </button>
          <button
            onClick={fetchJsonData}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
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
                {g.gameTime} {g.dhOrder ? `(DH${g.dhOrder})` : ''}
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
                      className="team-logo w-5 h-5 object-contain"
                    />
                  )}
                  <span className="font-semibold">{currentGame.away}</span>
                  {getRank(currentGame.away) && (
                    <span className="text-xs text-gray-700 dark:text-gray-300 ml-1">
                      {getRank(currentGame.away)}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">(원정)</span>
                  <span className="mx-1 text-gray-500">vs</span>
                  {getTeamInfo(currentGame.home).logo && (
                    <img
                      src={getTeamInfo(currentGame.home).logo}
                      alt={currentGame.home}
                      className="team-logo w-5 h-5 object-contain"
                    />
                  )}
                  <span className="font-semibold">{currentGame.home}</span>
                  {getRank(currentGame.home) && (
                    <span className="text-xs text-gray-700 dark:text-gray-300 ml-1">
                      {getRank(currentGame.home)}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">(홈)</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 leading-snug">
                  <div>
                    {currentGame.location || getTeamInfo(currentGame.home).stadium}
                  </div>
                  <div>
                    {formatDateKorean(currentGame.date)}
                    {(() => {
                      const isCanceled =
                        currentGame.canceled ||
                        (currentGame.gameStatus && currentGame.gameStatus.includes('취소'));
                      const gameDate = new Date(currentGame.date);
                      const nextDay = new Date(gameDate);
                      nextDay.setDate(gameDate.getDate() + 1);
                      nextDay.setHours(0, 0, 0, 0);
                      const isPast = new Date() >= nextDay;

                      let status = currentGame.gameStatus || '';
                      if (!isCanceled && isPast) {
                        status = '종료';
                      }
                      return status ? ` • ${status}` : '';
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <BallparkWeather forecast={forecast} gameTime={currentGame.gameTime} />
          {forecast && (
            <button
              onClick={() => setShowWeather(true)}
              className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <CloudSun className="w-4 h-4" /> 구장 날씨 보기
            </button>
          )}
          {showWeather && (
            <BallparkWeatherModal forecast={forecast} onClose={() => setShowWeather(false)} />
          )}

          {currentGame.canceled ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>이 경기는 취소되었습니다</p>
            </div>
          ) : currentLineup.length > 0 ? (
            <>
              {currentLineup.map((player, index) => (
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
                  getDisplayName={getDisplayName}
                />
              ))}
              {currentGame.startingPitcher && (
                <StartingPitcherCard
                  pitcher={currentGame.startingPitcher}
                  playerSongs={playerSongs}
                  selectedTeam={selectedTeam}
                  setCurrentPlayer={setCurrentPlayer}
                  setPlaySource={setPlaySource}
                  setShowPlayer={setShowPlayer}
                  setCurrentPlayerName={setCurrentPlayerName}
                  getDisplayName={getDisplayName}
                />
              )}
            </>
          ) : (
            <>
              {currentGame.startingPitcher && (
                <StartingPitcherCard
                  pitcher={currentGame.startingPitcher}
                  playerSongs={playerSongs}
                  selectedTeam={selectedTeam}
                  setCurrentPlayer={setCurrentPlayer}
                  setPlaySource={setPlaySource}
                  setShowPlayer={setShowPlayer}
                  setCurrentPlayerName={setCurrentPlayerName}
                  getDisplayName={getDisplayName}
                />
              )}
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
                      .filter(
                        (game) =>
                          game.team === selectedTeam &&
                          Array.isArray(game.lineup) &&
                          game.lineup.length > 0 &&
                          !game.canceled
                      )
                      .sort(
                        (a, b) => new Date(b.date) - new Date(a.date)
                      )[0];

                    if (recentGame) {
                      const dateOnly = new Date(recentGame.date)
                        .toISOString()
                        .split('T')[0];
                      setSelectedDate(dateOnly);
                    }
                  }}
                  className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  최근 라인업 보러가기
                </button>
              </div>
            </>
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
            const isAllStarBreak =
              selected.getMonth() === 6 &&
              selected.getDate() >= 11 &&
              selected.getDate() <= 16;
              if (isAllStarBreak) {
              return (
                <>
                  <p className="text-sm mt-2">🪫. . . 충 전 중 . . .🔋</p>
                  <p>올스타 브레이크 기간입니다</p>

                  <p className="text-sm mt-2">7월 17일 목요일에 만나요!</p>
                </>
              );
            }
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
                .filter(
                  (game) =>
                    game.team === selectedTeam &&
                    Array.isArray(game.lineup) &&
                    game.lineup.length > 0 &&
                    !game.canceled
                )
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

              if (recentGame) {
                const dateOnly = new Date(recentGame.date)
                  .toISOString()
                  .split('T')[0];
                setSelectedDate(dateOnly);
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
