const fs = require('fs');
const path = require('path');

const allStarPath = path.join(__dirname, '..', 'public', 'data', 'allStar2025.json');
const songsPath = path.join(__dirname, '..', 'public', 'data', 'playerSongs.json');
const outPath = path.join(__dirname, '..', 'public', 'data', 'allStarSongs2025.json');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function findSong(songs, playerName, team) {
  return songs.find((s) => s.playerName === playerName && s.team === team);
}

function addSongs(roster, songs) {
  ['best', 'coachPicks'].forEach((section) => {
    if (!Array.isArray(roster[section])) return;
    roster[section] = roster[section].map((entry) => {
      if (!entry.playerName) return entry;
      const song = findSong(songs, entry.playerName, entry.team);
      if (song) {
        return { ...entry, chantTitle: song.chantTitle, youtubeId: song.youtubeId };
      }
      return entry;
    });
  });
}

function generate() {
  const allStar = loadJson(allStarPath);
  const songs = loadJson(songsPath);

  const output = JSON.parse(JSON.stringify(allStar));
  addSongs(output.dream, songs);
  addSongs(output.nanum, songs);

  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Wrote song mapping to ${outPath}`);
}

if (require.main === module) {
  generate();
}

module.exports = generate;
