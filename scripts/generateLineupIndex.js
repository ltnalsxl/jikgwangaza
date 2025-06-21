const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'public', 'data', 'kbo_crawler_data');
const indexPath = path.join(dataDir, 'index.json');

function generateIndex() {
  const files = fs
    .readdirSync(dataDir)
    .filter(
      (file) =>
        file.endsWith('.json') &&
        file !== 'index.json' &&
        !file.includes('team1-team2') &&
        !file.startsWith('kbo_all_starting_lineups_')
    );

  files.sort();

  fs.writeFileSync(indexPath, JSON.stringify(files, null, 2));
  console.log(`Wrote ${files.length} entries to ${indexPath}`);
}

if (require.main === module) {
  generateIndex();
}

module.exports = generateIndex;
