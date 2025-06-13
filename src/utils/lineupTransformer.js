export const transformLineups = (lineupsData) => {
  if (Array.isArray(lineupsData)) {
    return lineupsData.map(game => ({
      id: game.id,
      date: game.date,
      team: game.team,
      home: game.home,
      away: game.away,
      location: game.location,
      lineup: Array.isArray(game.lineup) ? [...game.lineup].sort((a,b) => a.order - b.order) : []
    }));
  }

  if (lineupsData && Array.isArray(lineupsData.games)) {
    const games = lineupsData.games;
    const result = [];
    games.forEach(game => {
      const dateRaw = game.game_code ? game.game_code.slice(0,8) : '';
      const formattedDate = dateRaw ? `${dateRaw.slice(0,4)}-${dateRaw.slice(4,6)}-${dateRaw.slice(6,8)}` : '';
      const homeTeam = game.teams.find(t => t.is_home)?.name || '';
      const awayTeam = game.teams.find(t => !t.is_home)?.name || '';
      const team1 = game.starting_lineups.team_1;
      const team2 = game.starting_lineups.team_2;

      const makeLineup = (teamData, isHome) => ({
        id: `${formattedDate}_${teamData.team_name}`,
        date: formattedDate,
        team: teamData.team_name,
        home: isHome ? teamData.team_name : homeTeam,
        away: isHome ? awayTeam : teamData.team_name,
        location: '',
        lineup: [
          ...teamData.starting_batters.map(b => ({
            order: b.batting_order,
            playerName: b.name,
            position: b.position
          })),
          { order: 10, playerName: teamData.starting_pitcher.name, position: '투수' }
        ].sort((a,b) => a.order - b.order)
      });

      const isTeam1Home = team1.team_name === homeTeam;
      result.push(makeLineup(team1, isTeam1Home));
      result.push(makeLineup(team2, !isTeam1Home));
    });
    return result;
  }

  return [];
};
