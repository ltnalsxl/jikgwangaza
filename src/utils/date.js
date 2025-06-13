export const normalizeDate = (dateStr) => {
  if (!dateStr) return null;

  let cleanDateStr = dateStr.toString().trim();

  if (cleanDateStr.includes('GMT')) {
    const match = cleanDateStr.match(/(\w+)\s+(\w+)\s+(\d+)\s+(\d+)/);
    if (match) {
      const [, , month, day, year] = match;
      const monthMap = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04',
        May: '05', Jun: '06', Jul: '07', Aug: '08',
        Sep: '09', Oct: '10', Nov: '11', Dec: '12'
      };
      return `${year}-${monthMap[month]}-${day.padStart(2, '0')}`;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDateStr)) {
    return cleanDateStr;
  }

  try {
    const date = new Date(cleanDateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.warn('날짜 파싱 실패:', cleanDateStr, e);
  }

  return null;
};
