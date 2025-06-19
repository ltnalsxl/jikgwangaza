import React, { useRef } from 'react';
import YouTube from 'react-youtube';
import { Music, SkipBack, SkipForward, Pause, Play, Share2, Plus, Mail } from 'lucide-react';
import { getTeamInfo, getPositionKorean, getBattingOrder } from '../utils/team';
const PlayerTab = ({
  playerSongs,
  currentPlayer,
  playSource,
  currentLineup,
  currentLineupIndex,
  selectedTeam,
  playPrev,
  playNext,
  togglePlay,
  isPlaying,
  handleShare,
}) => {
  const playerRef = useRef(null);
  let currentChant = {};
  let hasPlayerData = true;

  if (playSource === 'lineup' && currentLineup[currentLineupIndex]) {
    const todayLineupPlayer = currentLineup[currentLineupIndex];

    const matchedSong = playerSongs.find(
      (song) =>
        song.playerName === todayLineupPlayer.playerName && song.team === selectedTeam
    );

    hasPlayerData = !!matchedSong;
    currentChant = { ...(matchedSong || {}), playerName: todayLineupPlayer.playerName };
    currentChant.order = todayLineupPlayer.order;
    currentChant.position = todayLineupPlayer.position;
  } else {
    currentChant = { ...playerSongs[currentPlayer] } || {};
  }
  const getDisplayTeam = () => {
    return playSource === 'lineup'
      ? selectedTeam
      : currentChant.teamCode || currentChant.team || '알 수 없음';
  };
  const getDisplayPosition = () => currentChant.position;
  const opts = {
    width: '100%',
    height: '235',
    playerVars: {
      autoplay: 1,
      mute: 0,
      controls: 1,
      rel: 0,
    },
  };
  const handleInfoRequest = () => {
    const subject = encodeURIComponent('선수 정보 요청');
    const body = encodeURIComponent(
      `${currentChant.playerName} (${getDisplayTeam()}) 정보 요청`
    );
    window.location.href = `mailto:ltnalsxl1011@gmail.com?subject=${subject}&body=${body}`;
  };
  return (
    <div className="space-y-6">
      {/* 선수 상세 정보 카드 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="mb-4">
          {/* 타순 정보 (라인업 모드에서만) */}
          {playSource === 'lineup' &&
            getBattingOrder(currentChant.order, getDisplayPosition()) && (
              <p className="text-sm text-blue-600 mb-2 font-medium">
                {getBattingOrder(currentChant.order, getDisplayPosition())}
              </p>
            )}
          {/* 선수명 */}
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {currentChant.playerName}
          </h2>
          {!hasPlayerData && (
            <p className="mt-2 text-center text-sm text-gray-500">
              선수 정보가 없습니다. 곧 업데이트됩니다.
            </p>
          )}
          {/* 기본 정보 그리드 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">소속팀</p>
                <div className="flex items-center gap-2">
                  {getTeamInfo(getDisplayTeam()).logo && (
                    <img
                      src={getTeamInfo(getDisplayTeam()).logo}
                      alt={getDisplayTeam()}
                      className="w-5 h-5 object-contain"
                    />
                  )}
                  <p className="text-lg font-semibold" style={{ color: getTeamInfo(getDisplayTeam()).color }}>
                    {getDisplayTeam()}
                  </p>
                </div>
              </div>
              {getDisplayPosition() && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">포지션</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    {getPositionKorean(getDisplayPosition())}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {currentChant.number && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">등번호</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    {currentChant.number}번
                  </p>
                </div>
              )}
              {currentChant.throwBat && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">투타</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                    {currentChant.throwBat}
                  </p>
                </div>
              )}
            </div>
          </div>
          {/* 추가 정보 */}
          <div className="grid grid-cols-1 gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            {currentChant.birth && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">생년월일</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  {currentChant.birth.split('T')[0]}
                </span>
              </div>
            )}
            {currentChant.body && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">체격</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  {currentChant.body}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* YouTube 플레이어 */}
      <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: '56.25%', height: 0 }}>
        <div className="absolute top-0 left-0 w-full h-full">
          {currentChant.youtubeId && currentChant.youtubeId !== 'example' ? (
            <YouTube
              key={`player-${currentChant.youtubeId}`}
              videoId={currentChant.youtubeId}
              opts={opts}
              onReady={(event) => {
                playerRef.current = event.target;
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center text-white bg-gray-900">
              <div>
                <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">{currentChant.chantTitle || '응원가 정보 없음'}</p>
                <p className="text-sm opacity-70">응원가를 준비중입니다</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* 컨트롤 버튼 */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={playPrev}
          disabled={
            (playSource === 'explore' && currentPlayer === 0) ||
            (playSource === 'lineup' && currentLineupIndex === 0)
          }
          className="p-3 rounded-full bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
        >
          <SkipBack className="w-6 h-6" />
        </button>
        <button
          onClick={togglePlay}
          className="p-4 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-lg"
        >
          {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
        </button>
        <button
          onClick={playNext}
          disabled={
            (playSource === 'explore' && currentPlayer === playerSongs.length - 1) ||
            (playSource === 'lineup' && currentLineupIndex === currentLineup.length - 1)
          }
          className="p-3 rounded-full bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
        >
          <SkipForward className="w-6 h-6" />
        </button>
      </div>
      {/* 액션 버튼 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => handleShare(currentChant)}
          className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          공유
        </button>
        <button
          onClick={handleInfoRequest}
          className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <Mail className="w-4 h-4" />
          정보 요청
        </button>
        <button className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          플레이리스트
        </button>
      </div>
    </div>
  );
};
export default PlayerTab;
