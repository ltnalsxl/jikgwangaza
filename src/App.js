import YouTube from 'react-youtube';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  SkipForward,
  SkipBack,
  Users,
  Circle,
  Music,
  Search,
  Star,
  TrendingUp,
  Filter,
  Share2,
  Plus,
  MessageCircle,
  ThumbsUp,
  RefreshCw,
  Moon,
  Sun,
  AlertCircle,
  Trophy,
  Calendar
} from 'lucide-react';
import ChantCard from './components/ChantCard';
import LyricsSection from './components/LyricsSection';
import TeamChantVideo from './components/TeamChantVideo';
import LineupTab from './components/LineupTab';
import { getTeamInfo, getPositionKorean, getBattingOrder } from './utils/team';
import PlayerTab from './components/PlayerTab';
import ExploreTab from './components/ExploreTab';
import TeamChantsTab from './components/TeamChantsTab';
import ScheduleTab from './components/ScheduleTab'; // for modal
import RankingTab from './components/RankingTab';
import CalendarDropdown from './components/CalendarDropdown';
import TeamDropdown from './components/TeamDropdown';
import useKboData from './hooks/useKboData';
import Footer from './components/Footer';
import AddToHomePopup from './components/AddToHomePopup';
import TeamSelectModal from './components/TeamSelectModal';

// simple helper to avoid logs in production
const debugLog = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};






const JikgwanGaja = () => {
  
  const [exploreTeamFilter, setExploreTeamFilter] = useState('전체');
  const [hasSongOnly, setHasSongOnly] = useState(false);
  // 기본적으로 투수를 제외하고 타자만 표시한다
  const [hasBatterOnly, setHasBatterOnly] = useState(true);

  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [activeTab, setActiveTab] = useState('lineup');
  const [showPlayer, setShowPlayer] = useState(false);
  const [currentPlayerName, setCurrentPlayerName] = useState('');
  const [pendingPlayerName, setPendingPlayerName] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [selectedTeam, setSelectedTeam] = useState(() => {
    const stored = localStorage.getItem('favoriteTeam');
    return stored && stored !== 'none' ? stored : 'KIA';
  });
  const [showTeamModal, setShowTeamModal] = useState(() => !localStorage.getItem('favoriteTeam'));
  const [selectedGameCode, setSelectedGameCode] = useState(null);
  const [playSource, setPlaySource] = useState('lineup');
  const [currentLineupIndex, setCurrentLineupIndex] = useState(0);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Keep explore tab independent of the globally selected team
  // Default to showing all teams so users can search freely


  
  const handleChange = (e) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    searchRef.current = newValue;
    if (!isComposing) {
      setImmediateSearch(newValue);
    }
  };
  
  const handleCompositionStart = () => {
    setIsComposing(true);
  };
  
  const handleCompositionEnd = (e) => {
    setIsComposing(false);
    // 조합이 끝났을 때 검색 실행 (최종 확정된 문자열 사용)
    setImmediateSearch(e.target.value);
  };
  

  const {
    playerSongs,
    gameLineups,
    teamChants,
    kboPlayers,
    rawSongs,
    loading,
    error,
    fetchJsonData,
    teamRanks,
    teamRankTime,
  } = useKboData();
  const [currentLineup, setCurrentLineup] = useState([]);
  const gameDatesForTeam = useMemo(
    () =>
      new Set(
        gameLineups
          .filter((game) => {
            const parts = game.id.split('_');
            const team = parts[parts.length - 1];
            return parts.length >= 2 && team === selectedTeam;
          })
          .map((game) => game.id.split('_')[0])
      ),
    [gameLineups, selectedTeam]
  );




  




 return (
  <div className="max-w-md mx-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 min-h-screen flex flex-col dark:text-gray-100">
     {/* 헤더 */}
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b shadow-sm text-gray-900 p-4 border-gray-100 dark:bg-gray-800/90 dark:text-gray-100 dark:border-gray-700 overflow-visible">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <div 
          className="w-12 h-12 rounded-full border-3 bg-white flex items-center justify-center overflow-hidden"
          style={{ borderColor: getTeamInfo(selectedTeam).color }}
        >
          {getTeamInfo(selectedTeam).logo ? (
            <img 
              src={getTeamInfo(selectedTeam).logo}
              alt={selectedTeam}
              className="w-8 h-8 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
          ) : null}
          <Circle 
            className="w-6 h-6" 
            style={{ 
              color: getTeamInfo(selectedTeam).color,
              display: getTeamInfo(selectedTeam).logo ? 'none' : 'block'
            }} 
          />
        </div>
                          
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">직관가자</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300">
            {getTeamInfo(selectedTeam).fullName} • {formatDateKorean(selectedDate)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            setSelectedDate(`${yyyy}-${mm}-${dd}`);
            fetchJsonData();
          }}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-yellow-500" />
          ) : (
            <Moon className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>
       </div>

       {/* 날짜/팀 선택 */}
        <div className="mt-4 flex items-center gap-3">
          <CalendarDropdown
            value={selectedDate}
            onChange={setSelectedDate}
            gameDates={gameDatesForTeam}
            onOpenSchedule={() => setShowScheduleModal(true)}
          />
          <TeamDropdown
            value={selectedTeam}
            onChange={(team) => {
              setSelectedTeam(team);
              try {
                localStorage.setItem('favoriteTeam', team);
              } catch {
                // ignore write errors
              }
            }}
          />
        </div>
     </div>

     {/* 탭 네비게이션 */}
      <div className="sticky top-0 z-20 flex bg-gray-50 border-b dark:bg-gray-800 dark:border-gray-700">
        <button
          onClick={() => {
            setActiveTab('lineup');
            setShowPlayer(false);
          }}
          className={`flex-1 py-3 px-2 text-center font-medium transition-colors flex flex-col items-center space-y-2 ${
            activeTab === 'lineup' && !showPlayer
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-[#005BAC] bg-white dark:bg-gray-900'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Users className="w-6 h-6" />
          <span className="text-xs">라인업</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('teamChants');
            setShowPlayer(false);
          }}
          className={`flex-1 py-3 px-2 text-center font-medium transition-colors flex flex-col items-center space-y-2 ${
            activeTab === 'teamChants' && !showPlayer
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-[#005BAC] bg-white dark:bg-gray-900'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Trophy className="w-6 h-6" />
          <span className="text-xs">팀응원가</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('explore');
            setShowPlayer(false);
          }}
          className={`flex-1 py-3 px-2 text-center font-medium transition-colors flex flex-col items-center space-y-2 ${
            activeTab === 'explore' && !showPlayer
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-[#005BAC] bg-white dark:bg-gray-900'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Search className="w-6 h-6" />
          <span className="text-xs">탐색</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('ranking');
            setShowPlayer(false);
          }}
          className={`flex-1 py-3 px-2 text-center font-medium transition-colors flex flex-col items-center space-y-2 ${
            activeTab === 'ranking' && !showPlayer
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-[#005BAC] bg-white dark:bg-gray-900'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Trophy className="w-6 h-6" />
          <span className="text-xs">순위</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('schedule');
            setShowPlayer(false);
          }}
          className={`flex-1 py-3 px-2 text-center font-medium transition-colors flex flex-col items-center space-y-2 ${
            activeTab === 'schedule' && !showPlayer
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-[#005BAC] bg-white dark:bg-gray-900'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-xs">일정</span>
        </button>
      </div>

     {/* 메인 콘텐츠 */}
      <div className="p-4">
        {showPlayer ? (
          <div className="space-y-4">
            <button
              onClick={() => setShowPlayer(false)}
              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
            >
              <SkipBack className="w-5 h-5" />
              <span className="sr-only">라인업으로 돌아가기</span>
            </button>
              <PlayerTab
                playerSongs={playerSongs}
                currentPlayer={currentPlayer}
                playSource={playSource}
                currentLineup={currentLineup}
                currentLineupIndex={currentLineupIndex}
                selectedTeam={selectedTeam}
                playPrev={playPrev}
                playNext={playNext}
                handleShare={handleShare}
                getDisplayName={getDisplayName}
              />
          </div>
        ) : (
          <>
            {activeTab === 'lineup' && (
              <LineupTab
                currentLineup={currentLineup}
                currentPlayer={currentPlayer}
                playerSongs={playerSongs}
                selectedTeam={selectedTeam}
                selectedDate={selectedDate}
                selectedGameCode={selectedGameCode}
                setSelectedGameCode={setSelectedGameCode}
                availableGames={getTodayGames()}
                fetchJsonData={fetchJsonData}
                loading={loading}
                error={error}
                getCurrentGame={getCurrentGame}
                formatDateKorean={formatDateKorean}
                setCurrentPlayer={setCurrentPlayer}
                setCurrentLineupIndex={setCurrentLineupIndex}
                setPlaySource={setPlaySource}
                setShowPlayer={setShowPlayer}
                setCurrentPlayerName={setCurrentPlayerName}
                gameLineups={gameLineups}
                setSelectedDate={setSelectedDate}
                handleShareLineup={handleShareLineup}
                teamRanks={teamRanks}
                getDisplayName={getDisplayName}
              />
            )}
            {activeTab === 'teamChants' && (
              <TeamChantsTab
                teamChants={teamChants}
                selectedTeam={selectedTeam}
                setSelectedDate={setSelectedDate}
                fetchJsonData={fetchJsonData}
                loading={loading}
              />
            )}
            {activeTab === 'explore' && (
              <ExploreTab
                searchQuery={searchQuery}
                handleChange={handleChange}
                handleCompositionStart={handleCompositionStart}
                handleCompositionEnd={handleCompositionEnd}
                exploreTeamFilter={exploreTeamFilter}
                setExploreTeamFilter={setExploreTeamFilter}
                hasSongOnly={hasSongOnly}
                setHasSongOnly={setHasSongOnly}
                hasBatterOnly={hasBatterOnly}
                setHasBatterOnly={setHasBatterOnly}
                playerSongs={playerSongs}
                kboPlayers={kboPlayers}
                rawSongs={rawSongs}
                filteredChants={filteredChants}
                error={error}
                setSelectedDate={setSelectedDate}
                fetchJsonData={fetchJsonData}
                setCurrentPlayer={setCurrentPlayer}
                setPlaySource={setPlaySource}
                setShowPlayer={setShowPlayer}
                handleShare={handleShare}
                setSearchQuery={setSearchQuery}
                isComposing={isComposing}
              setCurrentPlayerName={setCurrentPlayerName}
              getDisplayName={getDisplayName}
            />
            )}
            {activeTab === 'ranking' && (
              <RankingTab teamRanks={teamRanks} rankUpdatedAt={teamRankTime} />
            )}
            {activeTab === 'schedule' && (
              <ScheduleTab
                selectedTeam={selectedTeam}
                gameLineups={gameLineups}
                formatDateKorean={formatDateKorean}
                setSelectedDate={setSelectedDate}
                setActiveTab={setActiveTab}
              />
            )}
          </>
        )}
      </div>
      <Footer />
      <AddToHomePopup />
      {showTeamModal && <TeamSelectModal onSelect={handleInitialTeam} />}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 m-4 p-4 rounded-xl flex-1 overflow-y-auto">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                닫기
              </button>
            </div>
            <ScheduleTab
              selectedTeam={selectedTeam}
              gameLineups={gameLineups}
              formatDateKorean={formatDateKorean}
              setSelectedDate={setSelectedDate}
              setActiveTab={setActiveTab}
            />
          </div>
        </div>
      )}
   </div>
 );
};


export default JikgwanGaja;
