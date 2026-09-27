const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'public', 'data', 'kbo_crawler_data');
const indexPath = path.join(dataDir, 'index.json');

function generateIndex() {
  const allFiles = fs
    .readdirSync(dataDir)
    .filter(
      (file) =>
        file.endsWith('.json') &&
        file !== 'index.json' &&
        file !== 'seasons.json' &&
        !file.startsWith('season-') &&
        !file.includes('team1-team2') &&
        !file.startsWith('kbo_all_starting_lineups_')
    );

  // 게임 코드별로 가장 최신 파일만 유지 (` 2.json`, ` 3.json` 등 중복 제거)
  // 파일명 형식: YYYY-MM-DD_GAMECODE_팀A-팀B[ 2].json
  const gameCodeMap = new Map();
  for (const file of allFiles) {
    // 게임 코드 추출: 8자리 날짜 + 대문자+숫자 조합
    const match = file.match(/(\d{4}-\d{2}-\d{2}_\d{8}[A-Z0-9]+)/);
    if (match) {
      const key = match[1];
      const existing = gameCodeMap.get(key);
      // 공백 없는 원본 파일 우선, 없으면 가장 낮은 번호
      if (!existing) {
        gameCodeMap.set(key, file);
      } else if (!file.includes(' ') && existing.includes(' ')) {
        gameCodeMap.set(key, file);
      }
    } else {
      // 게임 코드 없는 파일은 그냥 포함
      gameCodeMap.set(file, file);
    }
  }

  const files = Array.from(gameCodeMap.values()).sort();

  fs.writeFileSync(indexPath, JSON.stringify(files, null, 2));
  console.log(`Wrote ${files.length} entries to ${indexPath} (deduped from ${allFiles.length})`);

  writeSeasonBundles(files);
}

const compactPlayer = (p, keys) => {
  if (!p) return null;
  const out = {};
  for (const k of keys) {
    if (p[k] !== undefined && p[k] !== '') out[k] = p[k];
  }
  return out;
};

const compactLineup = (team) => {
  if (!team) return undefined;
  return {
    team_name: team.team_name,
    starting_pitcher: compactPlayer(team.starting_pitcher, ['player_id', 'name', 'throwing_hand']),
    starting_batters: (team.starting_batters || []).map((b) =>
      compactPlayer(b, ['player_id', 'name', 'batting_order', 'position'])
    ),
  };
};

// 앱이 경기 파일 1,600여 개를 개별 요청하지 않도록 시즌별로 한 파일에 묶는다.
// 예전 크롤러는 종료된 경기도 마지막 이닝("9회말")을 상태로 저장했다. 지난 날짜면 종료로 본다.
const todayKst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const normalizeStatus = (date, status) =>
  date < todayKst && /^\d+회(초|말)$/.test(status || '') ? '종료' : status;

function writeSeasonBundles(files) {
  const seasons = new Map();
  for (const file of files) {
    let game;
    try {
      game = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
    } catch (e) {
      console.warn(`Skipping unreadable lineup file: ${file}`);
      continue;
    }
    if (!game || !game.date) continue;
    const season = String(game.date).slice(0, 4);
    const lineups = game.starting_lineups || {};
    const compact = {
      date: game.date,
      game_code: game.game_code,
      game_time: game.game_time,
      game_status: normalizeStatus(game.date, game.game_status),
      stadium: game.stadium || game.location || undefined,
      teams: (game.teams || []).map((t) => ({
        name: t.name,
        code: t.code,
        score: t.score,
        is_home: t.is_home,
      })),
      lineup_status: game.lineup_status,
      away_starter_name: game.away_starter_name || undefined,
      home_starter_name: game.home_starter_name || undefined,
    };
    if (lineups.team_1 || lineups.team_2) {
      compact.starting_lineups = {
        team_1: compactLineup(lineups.team_1),
        team_2: compactLineup(lineups.team_2),
      };
    }
    if (!seasons.has(season)) seasons.set(season, []);
    seasons.get(season).push(compact);
  }

  const seasonList = Array.from(seasons.keys()).sort();
  for (const season of seasonList) {
    const games = seasons.get(season).sort((a, b) =>
      `${a.date}_${a.game_code}`.localeCompare(`${b.date}_${b.game_code}`)
    );
    const outPath = path.join(dataDir, `season-${season}.json`);
    fs.writeFileSync(outPath, JSON.stringify(games));
    console.log(`Wrote ${games.length} games to ${outPath}`);
  }
  fs.writeFileSync(
    path.join(dataDir, 'seasons.json'),
    JSON.stringify(seasonList.map((s) => `season-${s}.json`), null, 2)
  );
}

if (require.main === module) {
  generateIndex();
}

module.exports = generateIndex;
