import YouTube from 'react-youtube';
import React, { useState, useRef, useEffect } from 'react';
import {
  SkipForward,
  SkipBack,
  Users,
  Settings,
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
  AlertCircle,
  Trophy,
  Sun,
  Moon
} from 'lucide-react';
import ChantCard from './components/ChantCard';
import LyricsSection from './components/LyricsSection';
import TeamChantVideo from './components/TeamChantVideo';
import LineupTab from './components/LineupTab';
import { getTeamInfo, getPositionKorean, getBattingOrder } from './utils/team';
import PlayerTab from './components/PlayerTab';
import ExploreTab from './components/ExploreTab';
import TeamChantsTab from './components/TeamChantsTab';
import useKboData from './hooks/useKboData';

// simple helper to avoid logs in production
const debugLog = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};






const JikgwanGaja = () => {
  
  const [exploreTeamFilter, setExploreTeamFilter] = useState('전체');

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

  const [selectedTeam, setSelectedTeam] = useState('KIA');
  const [playSource, setPlaySource] = useState('lineup');
  const [currentLineupIndex, setCurrentLineupIndex] = useState(0);
  

  const [searchQuery, setSearchQuery] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [immediateSearch, setImmediateSearch] = useState('');
  const searchRef = useRef('');
  const playerRef = useRef(null);

  // URL과 상태를 동기화한다
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const teamParam = params.get('team');
    const dateParam = params.get('date');
    const playerParam = params.get('player');
    if (teamParam) setSelectedTeam(teamParam);
    if (dateParam) setSelectedDate(dateParam);
    if (playerParam) setPendingPlayerName(playerParam);

    const setTabFromHash = () => {
      const tab = window.location.hash.replace('#', '');
      if (tab && ['lineup', 'teamChants', 'explore'].includes(tab)) {
        setActiveTab(tab);
        setShowPlayer(false);
      }
    };

    setTabFromHash();
    window.addEventListener('hashchange', setTabFromHash);
    return () => window.removeEventListener('hashchange', setTabFromHash);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('team', selectedTeam);
    params.set('date', selectedDate);
    if (showPlayer && currentPlayerName) {
      params.set('player', currentPlayerName);
    } else {
      params.delete('player');
    }
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}?${query}#${activeTab}`
    );
  }, [selectedTeam, selectedDate, activeTab, showPlayer, currentPlayerName]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      if (!localStorage.getItem('theme')) {
        setIsDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
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
    if (pendingPlayerName && playerSongs.length > 0) {
      const idx = playerSongs.findIndex(
        (song) =>
          song.playerName === pendingPlayerName && song.team === selectedTeam
      );
      if (idx !== -1) {
        setCurrentPlayer(idx);
        setCurrentPlayerName(pendingPlayerName);
        setPlaySource('explore');
        setShowPlayer(true);
      }
      setPendingPlayerName('');
    }
  }, [pendingPlayerName, playerSongs, selectedTeam]);

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


// getSortedChants 함수 수정 - 가나다순 정렬만 지원
const getSortedChants = () => {
  return [...playerSongs].sort((a, b) =>
    a.playerName.localeCompare(b.playerName, 'ko')
  );
};

  const filteredChants = getSortedChants().filter(chant => {
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


  const handlePlayAll = () => {
    if (currentLineup.length === 0) return;
  
    // ✅ 라인업 첫 번째 선수의 전역 인덱스 찾기
    const firstPlayerIndex = playerSongs.findIndex(song => 
      song.playerName === currentLineup[0].playerName && song.team === selectedTeam
    );
    
    if (firstPlayerIndex !== -1) {
      setCurrentPlayer(firstPlayerIndex);
      setShowPlayer(true);
    }
  }

  const handleShare = async (song) => {
    const url = song?.youtubeId
      ? `https://www.youtube.com/watch?v=${song.youtubeId}`
      : window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: song?.chantTitle,
          text: `${song?.playerName} 응원가`,
          url
        });
        return;
      } catch (err) {
        console.error('Share failed', err);
      }
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        alert('링크가 클립보드에 복사되었습니다.');
      } catch (err) {
        alert('링크 복사에 실패했습니다.');
      }
    } else {
      alert('공유 기능을 지원하지 않는 브라우저입니다.');
    }
  };

  const handleShareLineup = async () => {
    const lineupText = currentLineup
      .map((p, idx) => `${idx + 1}. ${p.playerName} (${p.position})`)
      .join('\n');
    const text = `${selectedTeam} 오늘의 라인업\n${lineupText}`;
    const lineupUrl = `${window.location.origin}${window.location.pathname}?team=${selectedTeam}&date=${selectedDate}#lineup`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `${selectedTeam} 라인업`, text, url: lineupUrl });
        return;
      } catch (err) {
        console.error('Share failed', err);
      }
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(lineupUrl);
        alert('라인업 링크가 클립보드에 복사되었습니다.');
      } catch (err) {
        alert('라인업 링크 복사에 실패했습니다.');
      }
    } else {
      alert('공유 기능을 지원하지 않는 브라우저입니다.');
    }
  };



  



  // 날짜 옵션 생성 함수
  const getDateOptions = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    debugLog('getDateOptions - selectedTeam:', selectedTeam);
    debugLog('getDateOptions - gameLineups.length:', gameLineups.length);

    // 라인업 데이터에서 날짜 추출
    const gameDates = gameLineups
      .filter(game => {
        const idParts = game.id.split('_');
        const isValidGame = idParts.length === 2 && idParts[1] === selectedTeam;
        if (!isValidGame) {
          debugLog('getDateOptions - Filtering out game:', game.id, 'for team:', selectedTeam);
        }
        return isValidGame;
      })
      .map(game => game.id.split('_')[0]);

    debugLog('getDateOptions - extracted gameDates:', gameDates);

    // 중복 제거 및 정렬
    const uniqueDates = [...new Set([...gameDates, todayStr])].sort();

    debugLog('getDateOptions - uniqueDates:', uniqueDates);

    return uniqueDates.map(date => {
      const dateObj = new Date(date);
      const month = dateObj.getMonth() + 1;
      const day = dateObj.getDate();
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      const dayName = dayNames[dateObj.getDay()];
      return {
        value: date,
        label: `${month}월 ${day}일 (${dayName})`
      };
    });
  };

 return (
  <div className="max-w-md mx-auto bg-white min-h-screen dark:bg-gray-900 dark:text-gray-100">
     {/* 헤더 */}
    <div className="bg-white text-gray-900 p-4 border-b border-gray-100 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700">
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
          className="bg-gray-100 rounded-full p-2 hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="bg-gray-100 dark:bg-gray-700 rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-yellow-400" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </button>
        <Settings className="w-5 h-5 text-gray-600" />
      </div>
       </div>

       {/* 날짜/팀 선택 */}
        <div className="mt-4 flex items-center gap-3">
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-gray-50 text-gray-900 dark:bg-gray-700 dark:text-gray-100 text-sm rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
          >
            {getDateOptions().map(({ value, label }) => (
              <option key={value} value={value} className="text-gray-900">
                {label}
              </option>
            ))}
          </select>
          
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="bg-gray-50 text-gray-900 dark:bg-gray-700 dark:text-gray-100 text-sm rounded-lg px-4 py-2 border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
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
      <div className="flex bg-gray-50 border-b dark:bg-gray-800 dark:border-gray-700">
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
                setCurrentPlayerName={setCurrentPlayerName}
                gameLineups={gameLineups}
                setSelectedDate={setSelectedDate}
                handleShareLineup={handleShareLineup}
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
                playerSongs={playerSongs}
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
              />
            )}
          </>
        )}
      </div>
   </div>
 );
};


export default JikgwanGaja;
