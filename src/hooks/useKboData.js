import { useState, useEffect, useCallback } from 'react';

const normalizeTeamName = (teamName) => {
  const teamMap = {
    HH: '한화',
    한화: '한화',
    Hanwha: '한화',
    hanwha: '한화',
    KIA: 'KIA',
    kia: 'KIA',
    기아: 'KIA',
    두산: '두산',
    Doosan: '두산',
    doosan: '두산',
    OB: '두산', // 추가
    LG: 'LG',
    lg: 'LG',
    삼성: '삼성',
    Samsung: '삼성',
    samsung: '삼성',
    SS: '삼성', // 추가
    롯데: '롯데',
    Lotte: '롯데',
    lotte: '롯데',
    LT: '롯데', // 추가
    SSG: 'SSG',
    ssg: 'SSG',
    SK: 'SSG', // 추가
    키움: '키움',
    Kiwoom: '키움',
    kiwoom: '키움',
    WO: '키움', // 추가
    NC: 'NC',
    nc: 'NC',
    KT: 'KT',
    kt: 'KT',
  };
  return teamMap[teamName] || teamName;
};

// 날짜 정규화 함수
const normalizeDate = (dateStr) => {
  if (!dateStr) return null;
  
  try {
    // YYYY-MM-DD 형식이면 그대로 반환
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Date 객체로 변환 후 YYYY-MM-DD 형식으로 반환
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.warn('날짜 정규화 실패:', dateStr, e);
  }
  
  return null;
};

// 위치 정규화 함수
const normalizePosition = (position) => {
  const positionMap = {
    '투수': '투수',
    '포수': '포수',
    '1루수': '1루수',
    '2루수': '2루수',
    '3루수': '3루수',
    '유격수': '유격수',
    '좌익수': '좌익수',
    '중견수': '중견수',
    '우익수': '우익수',
    '지명타자': '지명타자',
    'P': '투수',
    'C': '포수',
    '1B': '1루수',
    '2B': '2루수',
    '3B': '3루수',
    'SS': '유격수',
    'LF': '좌익수',
    'CF': '중견수',
    'RF': '우익수',
    'DH': '지명타자',
  };
  return positionMap[position] || position;
};

const useKboData = () => {
  const [playerSongs, setPlayerSongs] = useState([]);
  const [gameLineups, setGameLineups] = useState([]);
  const [teamChants, setTeamChants] = useState([]);
  const [kboPlayers, setKboPlayers] = useState([]);
  const [rawSongs, setRawSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchJsonData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = process.env.PUBLIC_URL || '';
      
      // 병렬로 데이터 로드
      const [songsData, lineupIndex, teamChantsData, kboPlayersData] = await Promise.all([
        fetch(`${base}/data/playerSongs.json`).then((res) => res.json()),
        fetch(`${base}/data/kbo_crawler_data/index.json`).then((res) => res.json()),
        fetch(`${base}/data/teamChants.json`).then((res) => res.json()),
        fetch(`${base}/data/kboPlayers.json`).then((res) => res.json()),
      ]);

      console.log('로드된 데이터:', {
        songsCount: songsData?.length,
        lineupFiles: lineupIndex?.length,
        teamChantsCount: teamChantsData?.length,
        kboPlayersCount: kboPlayersData?.length
      });

      const parsedKboPlayers = Array.isArray(kboPlayersData) ? kboPlayersData : [];
      setKboPlayers(parsedKboPlayers);
      setRawSongs(Array.isArray(songsData) ? songsData : []);

      // 선수 응원가 데이터 처리 - KBO 선수 기준으로 구성
      const parsedSongsRaw = parsedKboPlayers.map((player) => {
        const teamName = normalizeTeamName(player.teamName);
        const matchedSong = Array.isArray(songsData)
          ? songsData.find(
              (song) =>
                normalizeTeamName(song.team) === teamName &&
                song.playerName === player.playerName
            )
          : null;

        return {
          id: `${teamName}_${player.playerName}`,
          playerName: player.playerName,
          team: teamName,
          chantTitle: matchedSong?.chantTitle || `${player.playerName} 응원가`,
          youtubeId: matchedSong?.youtubeId || '',
          type: matchedSong?.type || '응원가',
          lyrics: matchedSong?.lyrics || '',
          position: normalizePosition(player.position || ''),
          number: player.number || '',
          throwBat: player.throwBat || '',
          birth: player.birth || '',
          body: player.body || '',
          teamCode: player.teamCode || '',
          originalTeam: player.teamName,
          likes: Math.floor(Math.random() * 2000) + 500,
          views: Math.floor(Math.random() * 30000) + 5000,
          rating: (Math.random() * 1 + 4).toFixed(1),
          comments: Math.floor(Math.random() * 200) + 20,
          tags: ['신나는', '쉬운', '인기'],
          addedDate: new Date().toISOString().split('T')[0],
        };
      });

      // 중복 제거 (팀+선수 기준)
      const uniqueSongMap = new Map();
      parsedSongsRaw.forEach((song) => {
        if (!uniqueSongMap.has(song.id)) {
          uniqueSongMap.set(song.id, song);
        }
      });
      const parsedSongs = Array.from(uniqueSongMap.values());

      // 라인업 파일들 병렬 로드
      const lineupFiles = Array.isArray(lineupIndex) && lineupIndex.length > 0
        ? await Promise.allSettled(
            lineupIndex.map(async (file) => {
              try {
                const response = await fetch(
                  `${base}/data/kbo_crawler_data/${encodeURIComponent(file)}`
                );
                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
                }
                const data = await response.json();
                return { file, data };
              } catch (error) {
                console.warn(`파일 로드 실패: ${file}`, error);
                return null;
              }
            })
          )
        : [];

      console.log('라인업 파일 로드 결과:', {
        total: lineupFiles.length,
        success: lineupFiles.filter(result => result.status === 'fulfilled' && result.value).length,
        failed: lineupFiles.filter(result => result.status === 'rejected' || !result.value).length
      });

      // 라인업 데이터 파싱
      const parsedLineups = lineupFiles
        .filter(result => result.status === 'fulfilled' && result.value?.data)
        .flatMap(result => {
          const { file, data: game } = result.value;

          if (!game) {
            console.warn('게임 데이터 없음:', file);
            return [];
          }

          const isCanceled = !!(game.game_status && game.game_status.includes('취소'));

          if (!isCanceled && !game.starting_lineups) {
            console.warn('라인업 정보 없음:', file);
            return [];
          }

          try {
            const homeTeam = normalizeTeamName(game.teams?.find((t) => t.is_home)?.name || '');
            const awayTeam = normalizeTeamName(game.teams?.find((t) => !t.is_home)?.name || '');
            const dateStr = normalizeDate(game.date);
            const location = game.location || '미정';
            const gameTime = game.game_time
              ? game.game_time.replace('경기 시간', '').trim()
              : '미정';

            if (!dateStr) {
              console.warn('유효하지 않은 날짜:', game.date, file);
              return [];
            }

            const buildLineup = (lineupObj, teamName) => {
              if (!Array.isArray(lineupObj?.starting_batters)) {
                console.warn('타자 라인업 없음:', teamName, file);
                return [];
              }

              return lineupObj.starting_batters
                .map((batter) => ({
                  order: batter.batting_order,
                  playerName: batter.name,
                  position: normalizePosition(batter.position),
                }))
                .sort((a, b) => a.order - b.order);
            };

            const team1Name = normalizeTeamName(game.starting_lineups?.team_1?.team_name || '');
            const team2Name = normalizeTeamName(game.starting_lineups?.team_2?.team_name || '');

            if (!team1Name || !team2Name) {
              console.warn('팀명 정보 부족:', file, { team1Name, team2Name });
              return [];
            }

            const lineup1 = isCanceled ? [] : buildLineup(game.starting_lineups?.team_1, team1Name);
            const lineup2 = isCanceled ? [] : buildLineup(game.starting_lineups?.team_2, team2Name);

            return [
              {
                id: `${dateStr}_${team1Name}`,
                date: dateStr,
                team: team1Name,
                home: homeTeam,
                away: awayTeam,
                location: location,
                gameTime: gameTime,
                lineup: lineup1,
                canceled: isCanceled,
                gameStatus: game.game_status,
              },
              {
                id: `${dateStr}_${team2Name}`,
                date: dateStr,
                team: team2Name,
                home: homeTeam,
                away: awayTeam,
                location: location,
                gameTime: gameTime,
                lineup: lineup2,
                canceled: isCanceled,
                gameStatus: game.game_status,
              },
            ];
          } catch (error) {
            console.error('라인업 파싱 오류:', file, error);
            return [];
          }
        });

      console.log('파싱된 라인업:', {
        totalGames: parsedLineups.length,
        teams: [...new Set(parsedLineups.map(g => g.team))],
        dates: [...new Set(parsedLineups.map(g => normalizeDate(g.date)))].sort()
      });

      // 팀 응원가 데이터 처리
      const parsedTeamChants = Array.isArray(teamChantsData)
        ? teamChantsData.map((chant, idx) => ({
            id: chant.id || `${chant.team}_${idx}`,
            team: normalizeTeamName(chant.team),
            situation: chant.situation,
            chantTitle: chant.chantTitle,
            youtubeId: chant.youtubeId,
            lyrics: chant.lyrics,
            likes: Math.floor(Math.random() * 3000) + 1000,
            views: Math.floor(Math.random() * 50000) + 10000,
            rating: (Math.random() * 1 + 4).toFixed(1),
            comments: Math.floor(Math.random() * 200) + 50,
          }))
        : [];

      setPlayerSongs(parsedSongs);
      setGameLineups(parsedLineups);
      setTeamChants(parsedTeamChants);
      
      console.log('최종 설정된 데이터:', {
        playerSongs: parsedSongs.length,
        gameLineups: parsedLineups.length,
        teamChants: parsedTeamChants.length
      });

    } catch (err) {
      console.error('데이터 로드 오류:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJsonData();
  }, [fetchJsonData]);

  return {
    playerSongs,
    gameLineups,
    teamChants,
    kboPlayers,
    rawSongs,
    loading,
    error,
    fetchJsonData,
  };
};

export default useKboData;