export const normalizeText = (text = '') =>
  text
    .toString()
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');

const CHO = [
  'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'
];

export const getInitials = (text = '') =>
  Array.from(text).map(ch => {
    const code = ch.charCodeAt(0);
    if (code >= 44032 && code <= 55203) {
      const index = Math.floor((code - 44032) / 588);
      return CHO[index];
    }
    return ch;
  }).join('');

export const searchChants = (chants, query) => {
  const normQuery = normalizeText(query);
  const choQuery = getInitials(query);
  if (!normQuery) return chants;

  const results = chants.map(chant => {
    const title = normalizeText(chant.chantTitle);
    const lyrics = normalizeText(chant.lyrics);
    const titleCho = getInitials(chant.chantTitle);
    const lyricsCho = getInitials(chant.lyrics);
    let score = 0;
    if (title === normQuery) score = 3;
    else if (title.includes(normQuery)) score = 2;
    else if (lyrics.includes(normQuery)) score = 1;
    if (choQuery && (titleCho.includes(choQuery) || lyricsCho.includes(choQuery))) {
      score = Math.max(score, 1);
    }
    return { chant, score };
  }).filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.chant);

  return results;
};

export const highlight = (text = '', query = '') => {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'gi');
  const parts = text.split(regex);
  const matches = text.match(regex);
  if (!matches) return text;
  const result = [];
  parts.forEach((part, i) => {
    result.push(part);
    if (i < matches.length) {
      result.push(`<mark>${matches[i]}</mark>`);
    }
  });
  return result.join('');
};
