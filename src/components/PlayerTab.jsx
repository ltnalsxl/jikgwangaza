import React, { useRef } from 'react';
import YouTube from 'react-youtube';
import { Music, SkipBack, SkipForward, Share2, Plus, Mail } from 'lucide-react';
import { getTeamInfo, getPositionKorean, getBattingOrder } from '../utils/team';
import { logRequest } from '../utils/logging';
import LyricsSection from './LyricsSection';
const PlayerTab = ({
  playerSongs,
  currentPlayer,
  playSource,
  currentLineup,
  currentLineupIndex,
  selectedTeam,
  playPrev,
  playNext,
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
    const baseTeam =
      playSource === 'lineup'
        ? selectedTeam
        : currentChant.team || currentChant.teamCode || '알 수 없음';
    return getTeamInfo(baseTeam).text;
  };
  const getDisplayPosition = () => currentChant.position;
  const opts = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 1,
      mute: 0,
      controls: 1,
      rel: 0,
    },
  };
  const handleInfoRequest = () => {
    logRequest(currentChant.playerName, 'info');
    alert(`${currentChant.playerName} 선수에 대한 요청이 완료되었습니다.`);
  };

  const handleSongRequest = () => {
    logRequest(currentChant.playerName, 'song');
    alert(`${currentChant.playerName} 선수에 대한 요청이 완료되었습니다.`);
  };
  return (
    <div className="space-y-4">
      {/* 선수 상세 정보 카드 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700 shadow-sm">
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
            <div className="mt-2 text-center space-y-1">
              <p className="text-sm text-gray-500">
                선수 정보가 없습니다. 곧 업데이트됩니다.
              </p>
              <button
                onClick={handleInfoRequest}
                className="text-sm text-blue-500 underline"
              >
                정보 요청하기
              </button>
            </div>
          )}
          {/* 기본 정보 한줄 */}
          <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-gray-800 dark:text-gray-100">
            <div className="flex items-center gap-2">
              {getTeamInfo(getDisplayTeam()).logo && (
                <img
                  src={getTeamInfo(getDisplayTeam()).logo}
                  alt={getDisplayTeam()}
                  className="w-5 h-5 object-contain"
                />
              )}
              <span className="font-semibold" style={{ color: getTeamInfo(getDisplayTeam()).color }}>
                {getDisplayTeam()}
              </span>
              {currentChant.number && (
                <span className="font-semibold">{currentChant.number}번</span>
              )}
            </div>
            {getDisplayPosition() && (
              <>
                <span className="text-gray-300">|</span>
                <span>{getPositionKorean(getDisplayPosition())}</span>
              </>
            )}
            {currentChant.throwBat && (
              <>
                <span className="text-gray-300">|</span>
                <span>{currentChant.throwBat}</span>
              </>
            )}
          </div>
          {/* 추가 정보 */}
          {(currentChant.birth || currentChant.body) && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700 text-sm">
              {currentChant.birth && (
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  생년월일: {currentChant.birth.split('T')[0]}
                </span>
              )}
              {currentChant.birth && currentChant.body && (
                <span className="text-gray-400">|</span>
              )}
              {currentChant.body && (
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  체격: {currentChant.body}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {/* YouTube 플레이어 */}
      <div className="w-full rounded-xl overflow-hidden aspect-video">
        {currentChant.youtubeId && currentChant.youtubeId !== 'example' ? (
          <YouTube
            className="w-full h-full"
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
              <p className="text-sm opacity-70">응원가가 곧 업데이트됩니다.</p>
              <button onClick={handleSongRequest} className="mt-2 text-sm underline">
                요청하기
              </button>
            </div>
          </div>
        )}
      </div>
      <LyricsSection
        chant={currentChant}
        hasVideo={!!currentChant.youtubeId && currentChant.youtubeId !== 'example'}
        defaultExpanded
      />
      {/* 컨트롤 버튼 */}
      <div className="flex items-center justify-center gap-12">
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
      {/* 액션 버튼 (공유/정보 요청/플레이리스트) 제거 */}
    </div>
  );
};
export default PlayerTab;
