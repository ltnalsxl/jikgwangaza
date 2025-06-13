import YouTube from 'react-youtube';
import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Users,
  Settings,
  Circle,
  Music,
  Search,
  Heart,
  Star,
  TrendingUp,
  Filter,
  Share2,
  Plus,
  MessageCircle,
  ThumbsUp,
  RefreshCw,
  AlertCircle,
  Trophy
} from 'lucide-react';
import ChantCard from './components/ChantCard';
import LyricsSection from './components/LyricsSection';
import TeamChantVideo from './components/TeamChantVideo';
import LineupTab from './components/LineupTab';
import { getTeamInfo, getPositionKorean, getBattingOrder } from './utils/team';
import useKboData from './hooks/useKboData';

// simple helper to avoid logs in production
const debugLog = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};






const JikgwanGaja = () => {
  
  const [showOnlyLiked, setShowOnlyLiked] = useState(false);

  const [exploreTeamFilter, setExploreTeamFilter] = useState('전체');

  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState('lineup');
  const [showPlayer, setShowPlayer] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [selectedTeam, setSelectedTeam] = useState('KIA');
  const [sortBy, setSortBy] = useState('name');
  const [likedSongs, setLikedSongs] = useState(new Set());
  const [playSource, setPlaySource] = useState('lineup');
  const [currentLineupIndex, setCurrentLineupIndex] = useState(0);
  

  const [searchQuery, setSearchQuery] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [immediateSearch, setImmediateSearch] = useState('');
  const searchRef = useRef('');
  const playerRef = useRef(null);
  
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
    loading,
    error,
    fetchJsonData,
  } = useKboData();
  const [currentLineup, setCurrentLineup] = useState([]);

  useEffect(() => {
    if (gameLineups.length > 0 && playerSongs.length > 0) {
      updateCurrentLineup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedTeam, gameLineups, playerSongs]);

  const updateCurrentLineup = () => {
    debugLog('=== updateCurrentLineup 시작 ===');
    debugLog('selectedDate:', selectedDate);
    debugLog('selectedTeam:', selectedTeam);
    debugLog('gameLineups 전체:', gameLineups);
    debugLog('playerSongs 전체:', playerSongs);
  
    // iOS Safari 호환 날짜 정규화 함수
    const normalizeDate = (dateStr) => {
      if (!dateStr) return null;
      
      let cleanDateStr = dateStr.toString().trim();
      debugLog('날짜 정규화 시도:', cleanDateStr);
      
      // "Tue Jun 03 2025 00:00:00 GMT+0900" 형식 처리
      if (cleanDateStr.includes('GMT')) {
        const match = cleanDateStr.match(/(\w+)\s+(\w+)\s+(\d+)\s+(\d+)/);
        if (match) {
          const [, , month, day, year] = match;
          const monthMap = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
          };
          const result = `${year}-${monthMap[month]}-${day.padStart(2, '0')}`;
          debugLog('GMT 형식 변환 결과:', result);
          return result;
        }
      }
      
      // 이미 YYYY-MM-DD 형식이면 그대로 반환
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDateStr)) {
        debugLog('이미 정규 형식:', cleanDateStr);
        return cleanDateStr;
      }
      
      // Date 객체로 파싱 시도
      try {
        const date = new Date(cleanDateStr);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const result = `${year}-${month}-${day}`;
          debugLog('Date 객체 변환 결과:', result);
          return result;
        }
      } catch (e) {
        console.error('날짜 파싱 실패:', cleanDateStr, e);
      }
      
      debugLog('날짜 정규화 실패:', cleanDateStr);
      return null;
    };
  
    const selectedDateISO = normalizeDate(selectedDate);
    debugLog('선택된 날짜 ISO:', selectedDateISO);
    
    if (!selectedDateISO) {
      console.warn('선택된 날짜가 유효하지 않습니다:', selectedDate);
      setCurrentLineup([]);
      return;
    }
  
    // 오늘 경기 찾기
    const todayGame = gameLineups.find(game => {
      if (!game || !game.id) {
        debugLog('게임 ID 없음:', game);
        return false;
      }
  
      const idParts = game.id.split('_');
      if (idParts.length < 2) {
        debugLog('잘못된 게임 ID 형식:', game.id);
        return false;
      }
  
      const gameDateStr = idParts[0];
      const gameTeam = idParts[idParts.length - 1];
      const gameDateISO = normalizeDate(gameDateStr);
  
      debugLog(`게임 체크: ${game.id} -> 날짜: ${gameDateISO}, 팀: ${gameTeam}`);
      debugLog(`매칭 체크: 날짜(${gameDateISO === selectedDateISO}), 팀(${gameTeam === selectedTeam})`);
  
      return gameDateISO === selectedDateISO && gameTeam === selectedTeam;
    });
  
    debugLog('찾은 오늘 경기:', todayGame);
  
    // 라인업 구성 함수
    const buildLineup = (sourceGame) => {
      if (!sourceGame || !Array.isArray(sourceGame.lineup)) {
        debugLog('유효하지 않은 소스 게임:', sourceGame);
        return [];
      }
  
      debugLog('라인업 구성 시작:', sourceGame.lineup);
  
      const lineup = sourceGame.lineup.map((lineupPlayer, index) => {
        if (!lineupPlayer || !lineupPlayer.playerName) {
          debugLog('유효하지 않은 선수:', lineupPlayer);
          return null;
        }
  
        // 만약 lineupPlayer에 선발투수 정보가 있을 때 null 체크
        const pitcherName = lineupPlayer.starting_pitcher?.name || "-";
  
        const song = playerSongs.find(song => 
          song && song.playerName === lineupPlayer.playerName && song.team === selectedTeam
        );
  
        debugLog(`선수 ${lineupPlayer.playerName} 응원가:`, song ? '찾음' : '없음');
  
        return {
          ...lineupPlayer,
          id: song?.id || `temp_${lineupPlayer.playerName}_${index}`,
          chantTitle: song?.chantTitle || `${lineupPlayer.playerName} 응원가`,
          youtubeId: song?.youtubeId || 'example',
          likes: song?.likes || Math.floor(Math.random() * 1000) + 100,
          views: song?.views || Math.floor(Math.random() * 10000) + 1000,
          rating: song?.rating || (Math.random() * 1 + 4).toFixed(1),
          comments: song?.comments || Math.floor(Math.random() * 100) + 10,
          tags: song?.tags || ['응원가'],
          addedDate: song?.addedDate || new Date().toISOString().split('T')[0]
        };
      }).filter(Boolean);
  
      debugLog('구성된 라인업:', lineup);
      return lineup;
    };
  
    // 오늘 경기가 있으면 사용
    if (todayGame && Array.isArray(todayGame.lineup) && todayGame.lineup.length > 0) {
      const lineup = buildLineup(todayGame);
      debugLog('오늘 경기 라인업 설정:', lineup);
      setCurrentLineup(lineup);
      return;
    }
  
    debugLog('오늘 경기 없음, 이전 경기 찾기 시작');
  
    // 이전 경기 찾기
    const previousGames = gameLineups
      .filter(game => {
        if (!game || !game.id) return false;
        
        const idParts = game.id.split('_');
        if (idParts.length < 2) return false;
        
        const gameDateStr = idParts[0];
        const gameTeam = idParts[idParts.length - 1];
        const gameDateISO = normalizeDate(gameDateStr);
        
        const isValidGame = gameDateISO && gameDateISO < selectedDateISO && gameTeam === selectedTeam;
        debugLog(`이전 경기 체크: ${game.id} -> 유효: ${isValidGame}`);
        
        return isValidGame;
      })
      .sort((a, b) => {
        const dateA = normalizeDate(a.id.split('_')[0]);
        const dateB = normalizeDate(b.id.split('_')[0]);
        return dateB.localeCompare(dateA); // 최신순
      });
  
    debugLog('찾은 이전 경기들:', previousGames);
  
    const previousGame = previousGames[0];
    if (previousGame && Array.isArray(previousGame.lineup) && previousGame.lineup.length > 0) {
      const lineup = buildLineup(previousGame);
      debugLog('이전 경기 라인업 설정:', lineup);
      setCurrentLineup(lineup);
    } else {
      debugLog('매칭되는 경기 없음, 빈 라인업 설정');
      setCurrentLineup([]);
    }
  
    debugLog('=== updateCurrentLineup 종료 ===');
  };
  
  const getCurrentGame = () => {
    const normalizeDate = (dateStr) => {
      if (!dateStr) return null;
      
      let cleanDateStr = dateStr.toString().trim();
      
      if (cleanDateStr.includes('GMT')) {
        const match = cleanDateStr.match(/(\w+)\s+(\w+)\s+(\d+)\s+(\d+)/);
        if (match) {
          const [, , month, day, year] = match;
          const monthMap = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
          };
          return `${year}-${monthMap[month]}-${day.padStart(2, '0')}`;
        }
      }
      
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDateStr)) {
        return cleanDateStr;
      }
      
      try {
        const date = new Date(cleanDateStr);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      } catch (e) {
        console.warn('날짜 파싱 실패:', cleanDateStr, e);
      }
      
      return null;
    };
  
    const selectedDateISO = normalizeDate(selectedDate);
  
    return gameLineups.find(game => {
      if (!game || !game.id) return false;
  
      // 새로운 ID 구조 "YYYY-MM-DD_팀명" 처리
      const idParts = game.id.split('_');
      if (idParts.length !== 2) return false;
  
      const gameDateStr = idParts[0]; // YYYY-MM-DD
      const gameTeam = idParts[1];    // 팀명
  
      return gameDateStr === selectedDateISO && gameTeam === selectedTeam;
    });
  };
  

  const formatDateKorean = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${month}월 ${day}일(${dayName})`;
  };

  const toggleLike = (songId) => {
    debugLog('toggleLike 호출됨:', songId);
    debugLog('현재 likedSongs:', likedSongs);
    
    const newLiked = new Set(likedSongs);
    if (newLiked.has(songId)) {
      newLiked.delete(songId);
      debugLog('좋아요 제거:', songId);
    } else {
      newLiked.add(songId);
      debugLog('좋아요 추가:', songId);
    }
    
    debugLog('새로운 likedSongs:', newLiked);
    setLikedSongs(newLiked);
  };

// getSortedChants 함수 수정
const getSortedChants = () => {
  let sorted = [...playerSongs];
  switch(sortBy) {
    case 'popular':
      return sorted.sort((a, b) => b.likes - a.likes); // 좋아요 순
    case 'name':
      return sorted.sort((a, b) => a.playerName.localeCompare(b.playerName, 'ko')); // 가나다순
    default:
      return sorted;
  }
};

  const filteredChants = getSortedChants().filter(chant => {
    // 좋아한 곡만 보기 필터
    if (showOnlyLiked && !likedSongs.has(chant.id)) {
      return false;
    }
  
    // 팀 필터링
    if (exploreTeamFilter !== '전체' && chant.team !== exploreTeamFilter) {
      return false;
    }
  
    // 검색어 필터링 (한국어 개선)
    if (!immediateSearch) return true;
    
    const query = immediateSearch.trim().toLowerCase().normalize('NFC');
    const playerName = (chant.playerName || '').trim().toLowerCase().normalize('NFC');
    const chantTitle = (chant.chantTitle || '').trim().toLowerCase().normalize('NFC');
    const team = (chant.team || '').trim().toLowerCase().normalize('NFC');
    const position = (getPositionKorean(chant.position) || '').trim().toLowerCase().normalize('NFC');
    const tags = (chant.tags || []).map(tag => (tag || '').trim().toLowerCase().normalize('NFC'));
    
    return playerName.includes(query) || 
           chantTitle.includes(query) || 
           team.includes(query) ||
           position.includes(query) ||
           tags.some(tag => tag.includes(query));
  });
  
  const playNext = () => {
    if (playSource === 'lineup') {
      // 라인업 모드: 다음 타순으로
      if (currentLineupIndex < currentLineup.length - 1) {
        const nextLineupIndex = currentLineupIndex + 1;
        const nextPlayer = currentLineup[nextLineupIndex];
        
        const globalIndex = playerSongs.findIndex(song => 
          song.playerName === nextPlayer.playerName && song.team === selectedTeam
        );
        
        if (globalIndex !== -1) {
          setCurrentPlayer(globalIndex);
          setCurrentLineupIndex(nextLineupIndex);
        }
      }
    } else {
      // 탐색 모드: 전체 라이브러리 순서로
      if (currentPlayer < playerSongs.length - 1) {
        setCurrentPlayer(currentPlayer + 1);
      }
    }
  };
  
  const playPrev = () => {
    if (playSource === 'lineup') {
      // 라인업 모드: 이전 타순으로
      if (currentLineupIndex > 0) {
        const prevLineupIndex = currentLineupIndex - 1;
        const prevPlayer = currentLineup[prevLineupIndex];
        
        const globalIndex = playerSongs.findIndex(song => 
          song.playerName === prevPlayer.playerName && song.team === selectedTeam
        );
        
        if (globalIndex !== -1) {
          setCurrentPlayer(globalIndex);
          setCurrentLineupIndex(prevLineupIndex);
        }
      }
    } else {
      // 탐색 모드: 전체 라이브러리 순서로
      if (currentPlayer > 0) {
        setCurrentPlayer(currentPlayer - 1);
      }
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePlayAll = () => {
    if (currentLineup.length === 0) return;
  
    // ✅ 라인업 첫 번째 선수의 전역 인덱스 찾기
    const firstPlayerIndex = playerSongs.findIndex(song => 
      song.playerName === currentLineup[0].playerName && song.team === selectedTeam
    );
    
    if (firstPlayerIndex !== -1) {
      setCurrentPlayer(firstPlayerIndex);
      setIsPlaying(true);
      setShowPlayer(true);
    }
  }



  const TeamChantsTab = () => {
    const currentTeamChants = teamChants.filter(chant => chant.team === selectedTeam);
    
    // 상황별로 그룹화
    const chantsBySituation = currentTeamChants.reduce((acc, chant) => {
      const situation = chant.situation || '기본 응원가';
      if (!acc[situation]) acc[situation] = [];
      acc[situation].push(chant);
      return acc;
    }, {});
  
  
    const opts = {
      width: '100%',
      height: '200',
      playerVars: {
        autoplay: 0,
        mute: 1,
        controls: 1,
        rel: 0,
      }
    };
  
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-6"> {/* mb-4 → mb-6 */}
          <h2 className="text-2xl font-bold text-gray-900"> {/* text-lg → text-2xl, text-gray-800 → text-gray-900 */}
            {showOnlyLiked 
              ? '❤️ 좋아한 응원가' 
              : exploreTeamFilter === '전체' 
                ? '전체 응원가' 
                : `${exploreTeamFilter} 응원가`
            }
          </h2>
          <div className="flex items-center gap-3"> {/* gap-2 → gap-3 */}
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full"> {/* 배경 추가 */}
              {filteredChants.length}개
            </span>
            <button
              onClick={() => {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                setSelectedDate(`${yyyy}-${mm}-${dd}`);
                fetchJsonData();
              }}
              className="p-2 text-blue-600 hover:text-blue-800 transition-colors hover:bg-blue-50 rounded-full" // hover:bg-blue-50 rounded-full 추가
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
          
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">팀 응원가를 불러오는 중...</p>
          </div>
        ) : currentTeamChants.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{selectedTeam} 팀의 응원가가 없습니다</p>
            <p className="text-sm mt-2">곧 추가될 예정입니다!</p>
          </div>
        ) : (
          Object.entries(chantsBySituation).map(([situation, chants]) => (
            <div key={situation} className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
                {getTeamInfo(selectedTeam).logo ? (
                  <img 
                    src={getTeamInfo(selectedTeam).logo}
                    alt={selectedTeam}
                    className="w-5 h-5 object-contain"
                  />
                ) : (
                  <Trophy className="w-5 h-5" style={{ color: getTeamInfo(selectedTeam).color }} />
                )}
                {situation}
              </h3>
              
              {chants.map(chant => (
                <div key={chant.id} className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  {/* 제목 */}
                  <div className="p-4 pb-2">
                    <h4 className="font-bold text-lg">{chant.chantTitle}</h4>
                  </div>
                  {/* YouTube 영상 */}
                  <div className="relative w-full" style={{ paddingBottom: '56.25%', height: 0 }}>
                    <div className="absolute top-0 left-0 w-full h-full z-0">
                      <TeamChantVideo 
                        youtubeId={chant.youtubeId}
                        chantTitle={chant.chantTitle}
                        opts={opts}
                      />
                    </div>
                  </div>
                  
                  {/* 가사 섹션 */}
                <LyricsSection 
                  chant={chant} 
                  hasVideo={chant.youtubeId && chant.youtubeId !== ''} 
                />
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    );
  };
  

  const PlayerTab = () => {
    const currentChant = { ...playerSongs[currentPlayer] } || {};
    
    // 디버깅용 로그
    debugLog('PlayerTab - playSource:', playSource);
    debugLog('PlayerTab - currentChant:', currentChant);
    
    // 라인업에서 온 경우에만 오늘의 정보로 덮어쓰기
    if (playSource === 'lineup' && currentLineup[currentLineupIndex]) {
      const todayLineupPlayer = currentLineup[currentLineupIndex];
      currentChant.order = todayLineupPlayer.order;
      currentChant.position = todayLineupPlayer.position;
    }
  
    // 실제 팀명 표시용 함수
    const getDisplayTeam = () => {
      if (playSource === 'lineup') {
        return selectedTeam;
      } else {
        return currentChant.teamCode || currentChant.team || '알 수 없음';
      }
    };
  
    // 포지션 표시용 함수
    const getDisplayPosition = () => {
      return currentChant.position;
    };
  
    const opts = {
      width: '100%',
      height: '235',
      playerVars: {
        autoplay: 1,
        mute: 1,
        controls: 1,
        rel: 0,
      }
    };
  
    return (
      <div className="space-y-6">
        {/* 선수 상세 정보 카드 */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="mb-4">
            {/* 타순 정보 (라인업 모드에서만) */}
            {playSource === 'lineup' && getBattingOrder(currentChant.order, getDisplayPosition()) && (
              <p className="text-sm text-blue-600 mb-2 font-medium">
                {getBattingOrder(currentChant.order, getDisplayPosition())}
              </p>
            )}
            
            {/* 선수명 */}
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{currentChant.playerName}</h2>
            
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
                    <p className="text-lg font-semibold text-gray-800">
                      {getPositionKorean(getDisplayPosition())}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                {currentChant.number && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">등번호</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {currentChant.number}번
                    </p>
                  </div>
                )}
                
                {currentChant.throwBat && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">투타</p>
                    <p className="text-lg font-semibold text-gray-800">
                      {currentChant.throwBat}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* 추가 정보 */}
            <div className="grid grid-cols-1 gap-3 pt-3 border-t border-gray-100">
              {currentChant.birth && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">생년월일</span>
                  <span className="text-sm font-medium text-gray-800">
                    {currentChant.birth.split('T')[0]}
                  </span>
                </div>
              )}
              
              {currentChant.body && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">체격</span>
                  <span className="text-sm font-medium text-gray-800">
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
            disabled={(playSource === 'explore' && currentPlayer === 0) || (playSource === 'lineup' && currentLineupIndex === 0)}
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
            disabled={(playSource === 'explore' && currentPlayer === playerSongs.length - 1) || (playSource === 'lineup' && currentLineupIndex === currentLineup.length - 1)}
            className="p-3 rounded-full bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>
  
        {/* 액션 버튼 */}
        <div className="flex items-center gap-3">
          <button className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" />
            공유
          </button>
          <button className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            플레이리스트
          </button>
        </div>
      </div>
    );
  };

  const ExploreTab = () => (
    <div className="space-y-4">
      {/* 검색 및 필터 */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="선수명, 응원가 제목, 팀명, 포지션으로 검색"
            value={searchQuery}
            onChange={handleChange}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent bg-gray-50"
          />
        </div>
        
        {/* 팀 필터 추가 */}
        <div className="flex items-center gap-3 overflow-x-auto pb-3 mb-4"> {/* gap-2 → gap-3, pb-2 → pb-3, mb-4 추가 */}
        <Filter className="w-5 h-5 text-gray-500 flex-shrink-0" /> {/* w-4 h-4 → w-5 h-5 */}
        <select 
          value={exploreTeamFilter}
          onChange={(e) => setExploreTeamFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent shadow-sm" 
          // rounded-lg → rounded-xl, px-3 py-2 → px-4 py-3, shadow-sm 추가
        >
            <option value="전체">전체 팀</option>
            <option value="KIA">KIA 타이거즈</option>
            <option value="두산">두산 베어스</option>
            <option value="LG">LG 트윈스</option>
            <option value="삼성">삼성 라이온즈</option>
            <option value="롯데">롯데 자이언츠</option>
            <option value="SSG">SSG 랜더스</option>
            <option value="키움">키움 히어로즈</option>
            <option value="한화">한화 이글스</option>
            <option value="NC">NC 다이노스</option>
            <option value="KT">KT 위즈</option>
          </select>
        </div>
        
        <div className="flex items-center gap-3 overflow-x-auto pb-3">
          {[
            { key: 'popular', label: '인기순', icon: Heart, color: 'from-red-500 to-pink-500' },
            { key: 'name', label: '가나다순', icon: Circle, color: 'from-blue-500 to-indigo-500' }
          ].map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`flex items-center gap-2 px-5 py-3 rounded-full whitespace-nowrap transition-all font-medium ${
                sortBy === key 
                  ? `bg-gradient-to-r ${color} text-white shadow-lg shadow-gray-300 scale-105` 
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-lg">
          <h3 className="text-xl font-bold">{playerSongs.length}</h3>
          <p className="text-sm text-blue-100 mt-1">총 응원가</p>
        </div>
        <button
          onClick={() => setShowOnlyLiked(!showOnlyLiked)}
          className={`bg-gradient-to-br rounded-2xl p-4 text-white transition-all transform duration-200 shadow-lg ${
            showOnlyLiked 
              ? 'from-pink-500 via-pink-600 to-rose-600 scale-105 shadow-xl ring-2 ring-pink-200' 
              : 'from-purple-500 via-purple-600 to-purple-700 hover:scale-102 hover:shadow-xl'
          }`}
        >
          <h3 className="text-xl font-bold">{likedSongs.size}</h3>
          <p className="text-sm text-purple-100 mt-1">
            {showOnlyLiked ? '💖 선택됨' : '좋아한 곡'}
          </p>
        </button>
        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-2xl p-4 text-white shadow-lg">
          <h3 className="text-xl font-bold">{filteredChants.length}</h3>
          <p className="text-sm text-emerald-100 mt-1">검색 결과</p>
        </div>
      </div>
  
      {/* 응원가 목록 */}
      <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">
          {showOnlyLiked 
            ? '❤️ 좋아한 응원가' 
            : exploreTeamFilter === '전체' 
              ? '전체 응원가' 
              : `${exploreTeamFilter} 응원가`
          }
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{filteredChants.length}개</span>
          <button
            onClick={() => {
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, '0');
              const dd = String(today.getDate()).padStart(2, '0');
              setSelectedDate(`${yyyy}-${mm}-${dd}`);
              fetchJsonData();
            }}
            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
        
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-800 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>데이터 로드 오류: 임시 데이터 표시 중</span>
            </div>
          </div>
        )}
        
        {filteredChants.map((chant) => (
          <ChantCard
            key={chant.id}
            chant={chant}
            playerSongs={playerSongs}
            setCurrentPlayer={setCurrentPlayer}
            setPlaySource={setPlaySource}
            setShowPlayer={setShowPlayer}
            toggleLike={toggleLike}
            likedSongs={likedSongs}
          />
        ))}
        
        {filteredChants.length === 0 && (searchQuery || exploreTeamFilter !== '전체' || showOnlyLiked) && !isComposing && (
          <div className="text-center py-8 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>
              {showOnlyLiked 
                ? '좋아한 응원가가 없습니다'
                : searchQuery 
                  ? `"${searchQuery}"에 대한 검색 결과가 없습니다`
                  : `${exploreTeamFilter} 팀의 응원가가 없습니다`
              }
            </p>
            <div className="flex gap-2 justify-center mt-2">
              {showOnlyLiked && (
                <button 
                  onClick={() => setShowOnlyLiked(false)}
                  className="text-[#0ea5e9] text-sm"
                >
                  전체 응원가 보기
                </button>
              )}
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-[#0ea5e9] text-sm"
                >
                  검색어 지우기
                </button>
              )}
              {exploreTeamFilter !== '전체' && (
                <button 
                  onClick={() => setExploreTeamFilter('전체')}
                  className="text-[#0ea5e9] text-sm"
                >
                  전체 팀 보기
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

 return (
   <div className="max-w-md mx-auto bg-white min-h-screen">
     {/* 헤더 */}
     <div className="bg-white text-gray-900 p-4 border-b border-gray-100">
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
          <h1 className="text-xl font-bold text-gray-900">직관가자</h1>
          <p className="text-sm text-gray-500">
            {selectedTeam} 팬 • {formatDateKorean(selectedDate)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setActiveTab('explore');
            setShowPlayer(false);
            setShowOnlyLiked(!showOnlyLiked);
          }}
          className={`relative rounded-full p-2 transition-all ${
            showOnlyLiked ? 'bg-pink-100' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <Heart className={`w-5 h-5 ${showOnlyLiked ? 'text-pink-600' : 'text-gray-600'}`} />
          {likedSongs.size > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#ff4757] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {likedSongs.size}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            setSelectedDate(`${yyyy}-${mm}-${dd}`);
            fetchJsonData();
          }}
          className="bg-gray-100 rounded-full p-2 hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
        <Settings className="w-5 h-5 text-gray-600" />
      </div>
       </div>

       {/* 날짜/팀 선택 */}
        <div className="mt-4 flex items-center gap-3">
          <select 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-gray-50 text-gray-900 text-sm rounded-lg px-4 py-2 border border-gray-200 focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
          >
            <option value="2025-03-25" className="text-gray-900">3월 25일 (화)</option>
            <option value="2025-03-26" className="text-gray-900">3월 26일 (수)</option>
            <option value="2025-03-27" className="text-gray-900">3월 27일 (목)</option>
            <option value="2025-03-28" className="text-gray-900">3월 28일 (금)</option>
            <option value="2025-03-29" className="text-gray-900">3월 29일 (토)</option>
            <option value="2025-03-30" className="text-gray-900">3월 30일 (일)</option>
            <option value="2025-06-06" className="text-gray-900">6월 6일 (금)</option>
            <option value="2025-06-07" className="text-gray-900">6월 7일 (토)</option>
            <option value="2025-06-08" className="text-gray-900">6월 8일 (일)</option>
            <option value="2025-06-09" className="text-gray-900">6월 9일 (월)</option>
            <option value="2025-06-10" className="text-gray-900">6월 10일 (화)</option>
            <option value="2025-06-11" className="text-gray-900">6월 11일 (수)</option>
            <option value="2025-06-12" className="text-gray-900">6월 12일 (목)</option>
            <option value="2025-06-13" className="text-gray-900">6월 13일 (금)</option>
            <option value="2025-06-14" className="text-gray-900">6월 14일 (토)</option>
          </select>
          
          <select 
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="bg-gray-50 text-gray-900 text-sm rounded-lg px-4 py-2 border border-gray-200 focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
          >
            <option value="KIA" className="text-gray-900">KIA 타이거즈</option>
            <option value="두산" className="text-gray-900">두산 베어스</option>
            <option value="LG" className="text-gray-900">LG 트윈스</option>
            <option value="삼성" className="text-gray-900">삼성 라이온즈</option>
            <option value="롯데" className="text-gray-900">롯데 자이언츠</option>
            <option value="SSG" className="text-gray-900">SSG 랜더스</option>
            <option value="키움" className="text-gray-900">키움 히어로즈</option>
            <option value="한화" className="text-gray-900">한화 이글스</option>
            <option value="NC" className="text-gray-900">NC 다이노스</option>
            <option value="KT" className="text-gray-900">KT 위즈</option>
          </select>
        </div>
     </div>

     {/* 탭 네비게이션 */}
      <div className="flex bg-gray-50 border-b">
        <button 
          onClick={() => {
            setActiveTab('lineup');
            setShowPlayer(false);
          }}
          className={`flex-1 py-3 px-2 text-center font-medium transition-colors ${
            activeTab === 'lineup' && !showPlayer
              ? 'text-blue-600 border-b-2 border-[#005BAC] bg-white' 
              : 'text-gray-600'
          }`}
        >
          <Users className="w-4 h-4 mx-auto mb-1" />
          <span className="text-xs">라인업</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('teamChants');
            setShowPlayer(false);
          }}
          className={`flex-1 py-3 px-2 text-center font-medium transition-colors ${
            activeTab === 'teamChants' && !showPlayer
              ? 'text-blue-600 border-b-2 border-[#005BAC] bg-white' 
              : 'text-gray-600'
          }`}
        >
          <Trophy className="w-4 h-4 mx-auto mb-1" />
          <span className="text-xs">팀응원가</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('explore');
            setShowPlayer(false);
          }}
          className={`flex-1 py-3 px-2 text-center font-medium transition-colors ${
            activeTab === 'explore' && !showPlayer
              ? 'text-blue-600 border-b-2 border-[#005BAC] bg-white' 
              : 'text-gray-600'
          }`}
        >
          <Search className="w-4 h-4 mx-auto mb-1" />
          <span className="text-xs">탐색</span>
        </button>
      </div>

     {/* 메인 콘텐츠 */}
      <div className="p-4">
        {showPlayer ? (
          <div className="space-y-4">
            <button 
              onClick={() => setShowPlayer(false)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <SkipBack className="w-5 h-5" />
              라인업으로 돌아가기
            </button>
            <PlayerTab />
          </div>
        ) : (
          <>
            {activeTab === 'lineup' && (
              <LineupTab
                currentLineup={currentLineup}
                currentPlayer={currentPlayer}
                playerSongs={playerSongs}
                selectedTeam={selectedTeam}
                likedSongs={likedSongs}
                fetchJsonData={fetchJsonData}
                loading={loading}
                error={error}
                getCurrentGame={getCurrentGame}
                formatDateKorean={formatDateKorean}
                handlePlayAll={handlePlayAll}
                setCurrentPlayer={setCurrentPlayer}
                setCurrentLineupIndex={setCurrentLineupIndex}
                setPlaySource={setPlaySource}
                setShowPlayer={setShowPlayer}
                toggleLike={toggleLike}
                gameLineups={gameLineups}
                setSelectedDate={setSelectedDate}
              />
            )}
            {activeTab === 'teamChants' && <TeamChantsTab />}
            {activeTab === 'explore' && <ExploreTab />}
          </>
        )}
      </div>
   </div>
 );
};


export default JikgwanGaja;
