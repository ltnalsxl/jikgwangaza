const fs = require('fs');
const path = require('path');

const playerSongsPath = path.join(__dirname, '..', 'public', 'data', 'playerSongs.json');
const kboPlayersPath = path.join(__dirname, '..', 'public', 'data', 'kboPlayers.json');

const playerSongs = JSON.parse(fs.readFileSync(playerSongsPath, 'utf8'));
const kboPlayers = JSON.parse(fs.readFileSync(kboPlayersPath, 'utf8'));

const playerTeamMap = new Map();
for (const player of kboPlayers) {
  if (player.playerName && player.teamName) {
    playerTeamMap.set(player.playerName, player.teamName);
  }
}

let updatedCount = 0;
for (const song of playerSongs) {
  const teamName = playerTeamMap.get(song.playerName);
  if (teamName && song.team !== teamName) {
    song.team = teamName;
    updatedCount++;
  }
}

if (updatedCount > 0) {
  fs.writeFileSync(playerSongsPath, JSON.stringify(playerSongs, null, 2));
  console.log(`Updated ${updatedCount} player song entries with team names`);
} else {
  console.log('No updates needed');
}
