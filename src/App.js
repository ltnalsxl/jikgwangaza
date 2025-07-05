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
  useEffect(() => {
    setExploreTeamFilter('전체');
  }, []);

  useEffect(() => {
    setSelectedGameCode(null);
  }, [selectedDate, selectedTeam]);
  

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
    const gameParam = params.get('game');
    const playerParam = params.get('player');
    if (teamParam) setSelectedTeam(teamParam);
    if (dateParam) setSelectedDate(dateParam);
    if (gameParam) setSelectedGameCode(gameParam);
    if (playerParam) setPendingPlayerName(playerParam);

    const setTabFromHash = () => {
      const tab = window.location.hash.replace('#', '');
      if (
        tab &&
        ['lineup', 'teamChants', 'explore', 'ranking', 'schedule'].includes(tab)
      ) {
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
    if (selectedGameCode) {
      params.set('game', selectedGameCode);
    } else {
      params.delete('game');
    }
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
  }, [selectedTeam, selectedDate, selectedGameCode, activeTab, showPlayer, currentPlayerName]);

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

  useEffect(() => {
    if (pendingPlayerName && playerSongs.length > 0) {
      // Find the first matching song for the requested player.
      // Multiple entries may exist; we simply use the first one here.
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
  }, [selectedDate, selectedTeam, selectedGameCode, gameLineups, playerSongs]);

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
  
    const parseTime = (t) => {
      const m = t && t.match(/(\d{1,2}):(\d{2})/);
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : Infinity;
    };

    const todayGames = getTodayGames();

    let todayGame = null;
    if (todayGames.length > 0) {
      todayGame = todayGames.find((g) => g.gameCode === selectedGameCode) || todayGames[0];
      if (!selectedGameCode || selectedGameCode !== todayGame.gameCode) {
        setSelectedGameCode(todayGame.gameCode);
      }
    }

    debugLog('찾은 오늘 경기들:', todayGames);
    debugLog('선택된 오늘 경기:', todayGame);
  
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
  
        // Only the first matching song is used for lineup display.
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
  
    // 오늘 경기가 취소되었는지 확인
    if (todayGame && todayGame.canceled) {
      debugLog('오늘 경기 취소됨:', todayGame);
      setCurrentLineup([]);
      return;
    }

    // 오늘 경기가 있고 라인업이 존재하면 사용
    if (todayGame && Array.isArray(todayGame.lineup) && todayGame.lineup.length > 0) {
      const lineup = buildLineup(todayGame);
      debugLog('오늘 경기 라인업 설정:', lineup);
      setCurrentLineup(lineup);
      return;
    }

    // 선발투수만 있고 타자 라인업이 없으면 이전 경기 라인업을 사용하지 않음
    if (
      todayGame &&
      todayGame.startingPitcher &&
      Array.isArray(todayGame.lineup) &&
      todayGame.lineup.length === 0
    ) {
      debugLog('오늘 경기 선발투수만 확인, 라인업 미확정 상태');
      setCurrentLineup([]);
      return;
    }

    debugLog('오늘 경기 없음 또는 라인업 없음, 이전 경기 찾기 시작');
  
    // 이전 경기 찾기
    const previousGames = gameLineups
      .filter((game) => {
        if (!game || !game.id) return false;

        const parts = game.id.split('_');
        if (parts.length < 2) return false;

        const gameDateStr = parts[0];
        const gameTeam = parts[parts.length - 1];
        const gameDateISO = normalizeDate(gameDateStr);

        const isValidGame =
          gameDateISO && gameDateISO < selectedDateISO && gameTeam === selectedTeam;
        debugLog(`이전 경기 체크: ${game.id} -> 유효: ${isValidGame}`);

        return isValidGame;
      })
      .sort((a, b) => {
        const dateA = normalizeDate(a.id.split('_')[0]);
        const dateB = normalizeDate(b.id.split('_')[0]);
        if (dateA === dateB) {
          return parseTime(b.gameTime) - parseTime(a.gameTime);
        }
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

  const getTodayGames = () => {
    const normalizeDate = (dateStr) => {
      if (!dateStr) return null;
      let clean = dateStr.toString().trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
      try {
        const d = new Date(clean);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${dd}`;
        }
      } catch (e) {
        return null;
      }
      return null;
    };

    const parseTime = (t) => {
      const m = t && t.match(/(\d{1,2}):(\d{2})/);
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : Infinity;
    };

    const selectedDateISO = normalizeDate(selectedDate);

    const filtered = gameLineups
      .filter((game) => {
        if (!game || !game.id) return false;
        const parts = game.id.split('_');
        if (parts.length < 2) return false;
        const gameDateStr = parts[0];
        const team = parts[parts.length - 1];
        const gameDateISO = normalizeDate(gameDateStr);
        return gameDateISO === selectedDateISO && team === selectedTeam;
      })
      .sort((a, b) => parseTime(a.gameTime) - parseTime(b.gameTime));

    const groups = {};
    filtered.forEach((g) => {
      const key = `${g.date}_${g.home}_${g.away}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(g);
    });

    return filtered.map((g) => {
      const key = `${g.date}_${g.home}_${g.away}`;
      const group = groups[key];
      if (group.length > 1) {
        const index = group.indexOf(g);
        return { ...g, dhOrder: index + 1 };
      }
      return g;
    });
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
  
    const todayGames = getTodayGames();
    return (
      todayGames.find((g) => g.gameCode === selectedGameCode) ||
      todayGames[0] ||
      null
    );
  };
  

  const formatDateKorean = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${month}월 ${day}일(${dayName})`;
  };


// getSortedChants: return a name-sorted list of all song records.
// Multiple songs for a single player are kept as-is and sorted
// alongside one another.
const getSortedChants = () => {
  return [...playerSongs].sort((a, b) =>
    a.playerName.localeCompare(b.playerName, 'ko')
  );
};

  // Apply filters to the sorted list. Each record is processed independently
  // so multiple songs for the same player will all appear if they match.
  const filteredChants = getSortedChants().filter(chant => {
    // 팀 필터링
    if (exploreTeamFilter !== '전체' && chant.team !== exploreTeamFilter) {
      return false;
    }

    const posKor = getPositionKorean(chant.position);

    if (hasBatterOnly && posKor === '투수') {
      return false;
    }

    if (hasSongOnly && !chant.youtubeId) {
      return false;
    }

    if (['코치', '감독'].includes(posKor) && !chant.youtubeId) {
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
        
        // Determine the first matching song entry for the next lineup player.
        const globalIndex = playerSongs.findIndex(song =>
          song.playerName === nextPlayer.playerName && song.team === selectedTeam
        );
        
        if (globalIndex !== -1) {
          setCurrentPlayer(globalIndex);
        }
        setCurrentLineupIndex(nextLineupIndex);
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
        
        // Determine the first matching song entry for the previous lineup player.
        const globalIndex = playerSongs.findIndex(song =>
          song.playerName === prevPlayer.playerName && song.team === selectedTeam
        );
        
        if (globalIndex !== -1) {
          setCurrentPlayer(globalIndex);
        }
        setCurrentLineupIndex(prevLineupIndex);
      }
    } else {
      // 탐색 모드: 전체 라이브러리 순서로
      if (currentPlayer > 0) {
        setCurrentPlayer(currentPlayer - 1);
      }
    }
  };


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
    const gameParam = selectedGameCode ? `&game=${selectedGameCode}` : '';
    const lineupUrl = `${window.location.origin}${window.location.pathname}?team=${selectedTeam}&date=${selectedDate}${gameParam}#lineup`;

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

  const handleInitialTeam = (team) => {
    try {
      localStorage.setItem('favoriteTeam', team);
    } catch {
      // ignore write errors
    }
    if (team !== 'none') {
      setSelectedTeam(team);
    }
    setShowTeamModal(false);
  };



  




 return (
  <div className="max-w-md mx-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 min-h-screen flex flex-col dark:text-gray-100">
     {/* 헤더 */}
    <div className="bg-white/90 backdrop-blur-xl border-b shadow-sm text-gray-900 p-4 border-gray-100 dark:bg-gray-800/90 dark:text-gray-100 dark:border-gray-700 overflow-visible relative z-10">
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
      <div className="flex bg-gray-50 border-b dark:bg-gray-800 dark:border-gray-700">
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
