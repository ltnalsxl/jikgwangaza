const fs = require('fs');
const path = require('path');

const playersPath = path.join(__dirname, '..', 'public', 'data', 'kboPlayers.json');
const outPath = path.join(__dirname, '..', 'public', 'data', 'kboPlayersEn.json');

const players = JSON.parse(fs.readFileSync(playersPath, 'utf8'));

const CHO = [
  'g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '',
  'j', 'jj', 'ch', 'k', 't', 'p', 'h'
];

const JUNG = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae',
  'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'
];

const JONG = [
  '', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'p', 'l', 'l',
  'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 'h'
];

function romanizeSyllable(ch) {
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return ch;
  const syllable = code - 0xac00;
  const jong = syllable % 28;
  const jung = Math.floor(syllable / 28) % 21;
  const cho = Math.floor(syllable / 28 / 21);
  return CHO[cho] + JUNG[jung] + JONG[jong];
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function romanizeName(name) {
  if (!name) return '';
  const chars = Array.from(name);
  const surname = capitalize(romanizeSyllable(chars[0]));
  if (chars.length === 1) return surname;
  const given = chars.slice(1).map(romanizeSyllable).map(capitalize).join('-');
  return `${surname} ${given}`;
}

const playersEn = players.map((p) => ({
  ...p,
  playerNameEn: romanizeName(p.playerName),
}));

fs.writeFileSync(outPath, JSON.stringify(playersEn, null, 2));
console.log(`Wrote ${playersEn.length} players to ${outPath}`);
