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
}

if (require.main === module) {
  generateIndex();
}

module.exports = generateIndex;
