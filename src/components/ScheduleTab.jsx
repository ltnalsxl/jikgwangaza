import React, { useMemo, useState } from 'react';
import { MapPin, ChevronRight } from 'lucide-react';
import { getTeamInfo } from '../utils/team';

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

// 구장 → 짧은 이름 + 도시
const STADIUM_META = {
  '잠실야구장':               { short: '잠실', city: '서울' },
  '고척 스카이돔':             { short: '고척', city: '서울' },
  '수원 KT 위즈파크':          { short: '수원', city: '수원' },
  '인천 SSG 랜더스필드':       { short: '인천', city: '인천' },
  '광주 KIA 챔피언스필드':     { short: '광주', city: '광주' },
  '대전 한화생명 이글스파크':  { short: '대전', city: '대전' },
  '부산 사직야구장':           { short: '사직', city: '부산' },
  '대구 삼성 라이온즈 파크':   { short: '대구', city: '대구' },
  '창원 NC파크':               { short: '창원', city: '창원' },
};

// 구장명 → 짧은 이름
const toShort = (raw = '') => {
  const match = Object.entries(STADIUM_META).find(([k]) => raw.includes(k.slice(0, 2)));
  return match ? match[1].short : raw.slice(0, 2) || '?';
};

const toCity = (raw = '') => {
  const match = Object.entries(STADIUM_META).find(([k]) => raw.includes(k.slice(0, 2)));
  return match ? match[1].city : '';
};

const ScheduleTab = ({
  selectedTeam,
  gameLineups,
  setSelectedDate,
  setActiveTab,
  teamRanks,
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  const [selectedStadium, setSelectedStadium] = useState(null); // null = 전체

  const getRank = (team) => {
    const r = teamRanks?.find((t) => t.team === team);
    return r ? `${r.rank}위` : '';
  };

  // 이 팀의 전체 경기 (취소 제외, 날짜 오름차순)
  const allGames = useMemo(
    () =>
      gameLineups
        .filter((g) => g.team === selectedTeam && !g.canceled)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [gameLineups, selectedTeam]
  );

  // 각 경기의 구장 짧은 이름 캐싱
  const withStadium = useMemo(
    () =>
      allGames.map((g) => {
        const raw = g.location || getTeamInfo(g.home).stadium || '';
        return { ...g, stadiumShort: toShort(raw), stadiumCity: toCity(raw) };
      }),
    [allGames]
  );

  // 예정 경기 (오늘 이후)
  const upcoming = useMemo(
    () => withStadium.filter((g) => g.date >= todayStr),
    [withStadium, todayStr]
  );

  // 구장 목록 (예정 경기 기준, 많은 순)
  const stadiumOptions = useMemo(() => {
    const counts = {};
    upcoming.forEach((g) => {
      counts[g.stadiumShort] = (counts[g.stadiumShort] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [upcoming]);

  // 선택된 구장 기준 필터
  const filteredUpcoming = useMemo(
    () =>
      selectedStadium
        ? upcoming.filter((g) => g.stadiumShort === selectedStadium)
        : upcoming,
    [upcoming, selectedStadium]
  );

  // 지난 경기 (선택된 구장 기준)
  const pastGames = useMemo(
    () =>
      withStadium
        .filter((g) => g.date < todayStr && (!selectedStadium || g.stadiumShort === selectedStadium))
        .reverse(),
    [withStadium, todayStr, selectedStadium]
  );

  const renderCard = (game, isPast) => {
    const d = new Date(game.date + 'T00:00:00');
    const mm = d.getMonth() + 1;
    const dd = String(d.getDate()).padStart(2, '0');
    const dow = DAYS_KO[d.getDay()];
    const isHome = game.home === selectedTeam;
    const opponent = isHome ? game.away : game.home;
    const isToday = game.date === todayStr;
    const isTomorrow =
      game.date ===
      new Date(today.getTime() + 86400000).toISOString().slice(0, 10);

    return (
      <div
        key={game.id}
        onClick={() => {
          if (setSelectedDate) setSelectedDate(game.date);
          if (setActiveTab) setActiveTab('lineup');
        }}
        className={`cursor-pointer rounded-xl p-3 flex items-center gap-3 transition-all active:scale-[0.98] ${
          isPast
            ? 'bg-gray-50 dark:bg-gray-800/40 opacity-40'
            : isToday
            ? 'bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-400'
            : isTomorrow
            ? 'bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-300'
            : 'bg-white dark:bg-gray-700 shadow-sm'
        }`}
      >
        {/* 날짜 블록 */}
        <div className="min-w-[46px] text-center shrink-0">
          <div
            className={`text-base font-bold leading-none ${
              isToday
                ? 'text-blue-600 dark:text-blue-400'
                : isTomorrow
                ? 'text-amber-600 dark:text-amber-400'
                : isPast
                ? 'text-gray-400'
                : 'text-gray-800 dark:text-gray-100'
            }`}
          >
            {mm}.{dd}
          </div>
          <div className={`text-[11px] mt-0.5 ${dow === '토' ? 'text-blue-500' : dow === '일' ? 'text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {dow}요일
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            {game.gameTime && game.gameTime !== '미정' ? game.gameTime : ''}
          </div>
        </div>

        {/* 구분선 */}
        <div className="w-px self-stretch bg-gray-100 dark:bg-gray-600" />

        {/* 구장 */}
        <div className="min-w-[44px] shrink-0">
          <div className="flex items-center gap-0.5">
            <MapPin
              size={11}
              className={isHome ? 'text-blue-400' : 'text-gray-300 dark:text-gray-500'}
            />
            <span
              className={`text-sm font-semibold ${
                isHome
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {game.stadiumShort}
            </span>
          </div>
          <div className="text-[10px] text-gray-400 ml-3.5">
            {isHome ? '홈' : '원정'}
          </div>
        </div>

        {/* 상대팀 */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {getTeamInfo(opponent).logo && (
            <img
              src={getTeamInfo(opponent).logo}
              alt={opponent}
              className="w-7 h-7 object-contain shrink-0"
            />
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
              vs {opponent}
            </div>
            {getRank(opponent) && (
              <div className="text-[10px] text-gray-400">{getRank(opponent)}</div>
            )}
          </div>
        </div>

        {/* 라벨 / 화살표 */}
        <div className="text-xs shrink-0 text-gray-300 dark:text-gray-500">
          {isToday ? (
            <span className="text-blue-500 font-semibold text-[11px]">오늘</span>
          ) : isTomorrow ? (
            <span className="text-amber-500 font-semibold text-[11px]">내일</span>
          ) : isPast ? (
            <span className="text-gray-300 text-[11px]">종료</span>
          ) : (
            <ChevronRight size={14} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* 구장 선택 */}
      <div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">어디서 볼까요?</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedStadium(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              selectedStadium === null
                ? 'bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 border-transparent'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
            }`}
          >
            전체
          </button>
          {stadiumOptions.map(([short, cnt]) => (
            <button
              key={short}
              onClick={() => setSelectedStadium(short === selectedStadium ? null : short)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedStadium === short
                  ? 'bg-blue-500 text-white border-transparent'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
              }`}
            >
              <MapPin size={10} />
              {short}
              <span className={`ml-0.5 ${selectedStadium === short ? 'text-blue-100' : 'text-gray-400'}`}>
                {cnt}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 예정 경기 */}
      {filteredUpcoming.length > 0 ? (
        <div className="space-y-2">
          {filteredUpcoming.map((g) => renderCard(g, false))}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-gray-400">
          {selectedStadium
            ? `${selectedStadium} 예정 경기가 없어요`
            : '예정된 경기가 없어요'}
        </div>
      )}

      {/* 지난 경기 접기 */}
      {pastGames.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer select-none list-none flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 py-1">
            <ChevronRight
              size={12}
              className="transition-transform group-open:rotate-90"
            />
            지난 경기 {pastGames.length}경기
          </summary>
          <div className="space-y-2 mt-2">
            {pastGames.map((g) => renderCard(g, true))}
          </div>
        </details>
      )}
    </div>
  );
};

export default ScheduleTab;
