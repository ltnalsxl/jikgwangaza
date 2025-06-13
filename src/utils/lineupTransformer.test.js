import fs from 'fs';
import path from 'path';
import { transformLineups } from './lineupTransformer';

test('transforms crawler JSON lineup correctly', () => {
  const filePath = path.join(__dirname, '..', '..', 'public', 'data', 'kbo_crawler_data', '2025-03-25_20250325HHLG02025_한화-LG.json');
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const lineups = transformLineups(json);

  const hanwha = lineups.find(g => g.team === '한화');
  expect(hanwha.lineup.map(p => p.playerName)).toEqual([
    '김태연', '문현빈', '플로리얼', '노시환', '채은성', '안치홍', '임종찬', '최재훈', '심우준', '류현진'
  ]);

  const lg = lineups.find(g => g.team === 'LG');
  expect(lg.lineup.map(p => p.playerName)).toEqual([
    '홍창기', '송찬의', '오스틴', '문보경', '오지환', '박동원', '문정빈', '박해민', '구본혁', '에르난데스'
  ]);
});
