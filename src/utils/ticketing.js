// 홈 팀 기준 예매처. 티켓링크 팀 ID와 NOL 페이지는 2026-09 기준으로 확인함.
// open: 일반 예매 오픈 규칙(구단별 선예매 제외). 시즌 중 바뀔 수 있어 '예상'으로만 표시한다.
const TICKETLINK = { platform: '티켓링크', kind: 'ticketlink' };
const NOL = { platform: 'NOL 티켓', kind: 'nol' };

export const TICKETING = {
  KIA: { ...TICKETLINK, url: 'https://www.ticketlink.co.kr/sports/137/58', open: { daysBefore: 7, time: '11:00' } },
  삼성: { ...TICKETLINK, url: 'https://www.ticketlink.co.kr/sports/137/57', open: { daysBefore: 7, time: '11:00' } },
  LG: { ...TICKETLINK, url: 'https://www.ticketlink.co.kr/sports/137/59', open: { daysBefore: 7, time: '11:00' } },
  KT: { ...TICKETLINK, url: 'https://www.ticketlink.co.kr/sports/137/62', open: { daysBefore: 7, time: '14:00' } },
  한화: { ...TICKETLINK, url: 'https://www.ticketlink.co.kr/sports/137/63', open: { daysBefore: 7, time: '11:00' } },
  두산: { ...NOL, url: 'https://nol.yanolja.com/ticket/genre/sports/bears', open: { daysBefore: 7, time: '11:00' } },
  키움: { ...NOL, url: 'https://nol.yanolja.com/ticket/genre/sports/heroes', open: { daysBefore: 7, time: '14:00' } },
  NC: { platform: 'NC 티켓', kind: 'club', url: 'https://ticket.ncdinos.com', open: { daysBefore: 6, time: '11:00' } },
  SSG: {
    platform: 'SSG 랜더스 앱',
    kind: 'club',
    url: 'https://ticket.ssg.com/ticket',
    open: { note: '멤버십 등급별로 순차 오픈' },
  },
  롯데: {
    platform: '롯데 자이언츠',
    kind: 'club',
    url: 'https://ticket.giantsclub.com',
    open: { weekly: true, time: '14:00', note: '화~목 경기는 전주 화요일, 금~일 경기는 전주 금요일' },
  },
};

export const PLATFORM_STYLE = {
  ticketlink: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',
  nol: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
  club: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

export const getTicketing = (homeTeam) => TICKETING[homeTeam] || null;

const pad = (n) => String(n).padStart(2, '0');

// 일반 예매 예상 오픈 시각 (Date, 로컬 시각) — 규칙을 알 수 없으면 null
export const estimateOpenAt = (homeTeam, dateStr) => {
  const info = getTicketing(homeTeam);
  if (!info?.open || !dateStr) return null;
  const game = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(game.getTime())) return null;
  let daysBefore = info.open.daysBefore;
  if (info.open.weekly) {
    // 롯데: 화(2)~목(4) → 전주 화요일, 금(5)~일(0) → 전주 금요일
    const dow = game.getDay();
    if (dow >= 2 && dow <= 4) daysBefore = 7 + (dow - 2);
    else if (dow === 5 || dow === 6) daysBefore = 7 + (dow - 5);
    else if (dow === 0) daysBefore = 9;
    else return null;
  }
  if (!daysBefore || !info.open.time) return null;
  const [h, m] = info.open.time.split(':').map(Number);
  const open = new Date(game);
  open.setDate(open.getDate() - daysBefore);
  open.setHours(h, m, 0, 0);
  return open;
};

export const describeOpenRule = (homeTeam) => {
  const open = getTicketing(homeTeam)?.open;
  if (!open) return '';
  if (open.weekly) return `${open.note} ${open.time}`;
  if (open.daysBefore) return `보통 경기 ${open.daysBefore}일 전 ${open.time}`;
  return open.note || '';
};

export const formatOpenAt = (date) => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}.${pad(date.getDate())}(${days[date.getDay()]}) ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
