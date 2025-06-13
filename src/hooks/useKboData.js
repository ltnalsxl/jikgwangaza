import { useState, useEffect, useCallback } from 'react';

const normalizeTeamName = (teamName) => {
  const teamMap = {
    HH: '한화',
    한화: '한화',
    Hanwha: '한화',
    hanwha: '한화',
    KIA: 'KIA',
    kia: 'KIA',
    두산: '두산',
    Doosan: '두산',
    doosan: '두산',
    LG: 'LG',
    lg: 'LG',
    삼성: '삼성',
    Samsung: '삼성',
    samsung: '삼성',
    롯데: '롯데',
    Lotte: '롯데',
    lotte: '롯데',
    SSG: 'SSG',
    ssg: 'SSG',
    키움: '키움',
    Kiwoom: '키움',
    kiwoom: '키움',
    NC: 'NC',
    nc: 'NC',
    KT: 'KT',
    kt: 'KT',
  };
  return teamMap[teamName] || teamName;
};

const useKboData = () => {
  const [playerSongs, setPlayerSongs] = useState([]);
  const [gameLineups, setGameLineups] = useState([]);
  const [teamChants, setTeamChants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchJsonData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = process.env.PUBLIC_URL || '';
      const [songsData, lineupIndex, teamChantsData, kboPlayersData] =
        await Promise.all([
          fetch(`${base}/data/playerSongs.json`).then((res) => res.json()),
          fetch(`${base}/data/kbo_crawler_data/index.json`).then((res) => res.json()),
          fetch(`${base}/data/teamChants.json`).then((res) => res.json()),
          fetch(`${base}/data/kboPlayers.json`).then((res) => res.json()),
        ]);

      const parsedKboPlayers = Array.isArray(kboPlayersData)
        ? kboPlayersData
        : [];

      const parsedSongs = Array.isArray(songsData)
        ? songsData.map((song) => {
            const playerTeam = normalizeTeamName(song.team);
            const kboPlayer = parsedKboPlayers.find(
              (p) =>
                normalizeTeamName(p.teamName) === playerTeam &&
                p.playerName === song.playerName
            );

            return {
              id: `${playerTeam}_${song.playerName}`,
              playerName: song.playerName,
              team: playerTeam,
              chantTitle: song.chantTitle || `${song.playerName} 응원가`,
              youtubeId: song.youtubeId || '',
              type: song.type || '응원가',
              createdAt: song.createdAt || '',
              position: kboPlayer?.position || '',
              number: kboPlayer?.number || '',
              throwBat: kboPlayer?.throwBat || '',
              birth: kboPlayer?.birth || '',
              body: kboPlayer?.body || '',
              teamCode: kboPlayer?.teamCode || '',
              originalTeam: song.team,
              likes: Math.floor(Math.random() * 2000) + 500,
              views: Math.floor(Math.random() * 30000) + 5000,
              rating: (Math.random() * 1 + 4).toFixed(1),
              comments: Math.floor(Math.random() * 200) + 20,
              tags: ['신나는', '쉬운', '인기'],
              addedDate: new Date().toISOString().split('T')[0],
            };
          })
        : [];

      const lineupFiles = Array.isArray(lineupIndex)
        ? await Promise.all(
            lineupIndex.map((file) =>
              fetch(`${base}/data/kbo_crawler_data/${file}`).then((res) => res.json())
            )
          )
        : [];

      const parsedLineups = Array.isArray(lineupFiles)
        ? lineupFiles.flatMap((game) => {
            if (!game || !game.starting_lineups) return [];

            const homeTeam = game.teams?.find((t) => t.is_home)?.name || '';
            const awayTeam = game.teams?.find((t) => !t.is_home)?.name || '';
            const dateStr = game.date;

            const buildLineup = (lineupObj) =>
              Array.isArray(lineupObj?.starting_batters)
                ? lineupObj.starting_batters.map((b) => ({
                    order: b.batting_order,
                    playerName: b.name,
                    position: b.position,
                  }))
                : [];

            const team1Name = normalizeTeamName(game.starting_lineups.team_1.team_name);
            const team2Name = normalizeTeamName(game.starting_lineups.team_2.team_name);

            return [
              {
                id: `${new Date(dateStr).toString()}_${team1Name}`,
                date: new Date(dateStr).toISOString(),
                team: team1Name,
                home: homeTeam,
                away: awayTeam,
                location: '',
                lineup: buildLineup(game.starting_lineups.team_1).sort(
                  (a, b) => a.order - b.order
                ),
              },
              {
                id: `${new Date(dateStr).toString()}_${team2Name}`,
                date: new Date(dateStr).toISOString(),
                team: team2Name,
                home: homeTeam,
                away: awayTeam,
                location: '',
                lineup: buildLineup(game.starting_lineups.team_2).sort(
                  (a, b) => a.order - b.order
                ),
              },
            ];
          })
        : [];

      const parsedTeamChants = Array.isArray(teamChantsData)
        ? teamChantsData.map((chant, idx) => ({
            id: chant.id || `${chant.team}_${idx}`,
            team: chant.team,
            situation: chant.situation,
            chantTitle: chant.chantTitle,
            youtubeId: chant.youtubeId,
            createdAt: chant.createdAt,
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
    } catch (err) {
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
    loading,
    error,
    fetchJsonData,
  };
};

export default useKboData;
