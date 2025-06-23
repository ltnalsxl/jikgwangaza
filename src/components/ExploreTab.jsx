import React from 'react';
import {
  Search,
  Filter,
  Circle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import ChantCard from './ChantCard';
import { getTeamInfo } from '../utils/team';
const ExploreTab = ({
  searchQuery,
  handleChange,
  handleCompositionStart,
  handleCompositionEnd,
  exploreTeamFilter,
  setExploreTeamFilter,
  setSortBy,
  playerSongs,
  kboPlayers,
  rawSongs,
  filteredChants,
  error,
  setSelectedDate,
  fetchJsonData,
  setCurrentPlayer,
  setPlaySource,
  setShowPlayer,
  handleShare,
  setSearchQuery,
  isComposing,
  setCurrentPlayerName,
}) => {
  const teamOptions = [
    'KIA',
    '두산',
    'LG',
    '삼성',
    '롯데',
    'SSG',
    '키움',
    '한화',
    'NC',
    'KT',
  ];
  const totalPlayers = Array.isArray(kboPlayers) ? kboPlayers.length : 0;
  const totalChants = Array.isArray(rawSongs)
    ? rawSongs.filter((song) => song.type === '응원가').length
    : 0;
  return (
    <div className="space-y-4">
    {/* 검색 및 필터 */}
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="선수명, 응원가 제목, 팀명, 포지션으로 검색"
          value={searchQuery}
          onChange={handleChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent bg-gray-50"
        />
      </div>
      {/* 팀 필터 */}
      <div className="space-y-2 pb-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <span className="text-sm text-gray-700">팀 선택</span>
          <button
            onClick={() => setExploreTeamFilter('전체')}
            className={`bg-white border px-3 py-1 rounded-lg text-xs font-medium text-gray-900 ${
              exploreTeamFilter === '전체'
                ? 'ring-2 ring-blue-500 border-transparent'
                : 'border-gray-200'
            }`}
          >
            전체
          </button>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {teamOptions.map((team) => (
            <button
              key={team}
              onClick={() => setExploreTeamFilter(team)}
              className={`bg-white border flex flex-col items-center p-2 rounded-lg ${
                exploreTeamFilter === team
                  ? 'ring-2 ring-blue-500 border-transparent'
                  : 'border-gray-200'
              }`}
            >
              <img
                src={getTeamInfo(team).logo}
                alt={team}
                className="w-8 h-8 object-contain mb-1"
              />
              <span className="text-xs text-gray-900">{team}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto pb-3">
        <button
          onClick={() => setSortBy('name')}
          className="flex items-center gap-2 px-5 py-3 rounded-full whitespace-nowrap transition-all font-medium bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:shadow-sm"
        >
          <Circle className="w-4 h-4" />
          가나다순
        </button>
      </div>
    </div>
    {/* 통계 카드 */}
    <div className="grid grid-cols-3 gap-3 mb-4">
      <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 rounded-xl p-3 text-white shadow">
        <h3 className="text-lg font-bold">{totalPlayers}</h3>
        <p className="text-xs text-indigo-100 mt-1">총 선수</p>
      </div>
      <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 rounded-xl p-3 text-white shadow">
        <h3 className="text-lg font-bold">{totalChants}</h3>
        <p className="text-xs text-blue-100 mt-1">총 응원가</p>
      </div>
      <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-xl p-3 text-white shadow">
        <h3 className="text-lg font-bold">{filteredChants.length}</h3>
        <p className="text-xs text-emerald-100 mt-1">검색 결과</p>
      </div>
    </div>
    {/* 응원가 목록 */}
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">
          {exploreTeamFilter === '전체'
            ? '전체 응원가'
            : `${exploreTeamFilter} 응원가`}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{filteredChants.length}개</span>
          <button
            onClick={() => {
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, '0');
              const dd = String(today.getDate()).padStart(2, '0');
              setSelectedDate(`${yyyy}-${mm}-${dd}`);
              fetchJsonData();
            }}
            className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-yellow-800 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>데이터 로드 오류: 임시 데이터 표시 중</span>
          </div>
        </div>
      )}
      {filteredChants.map((chant) => (
        <ChantCard
          key={chant.id}
          chant={chant}
          playerSongs={playerSongs}
          setCurrentPlayer={setCurrentPlayer}
          setPlaySource={setPlaySource}
          setShowPlayer={setShowPlayer}
          handleShare={handleShare}
          setCurrentPlayerName={setCurrentPlayerName}
        />
      ))}
      {filteredChants.length === 0 && (searchQuery || exploreTeamFilter !== '전체') && !isComposing && (
        <div className="text-center py-8 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>
            {searchQuery
              ? `"${searchQuery}"에 대한 검색 결과가 없습니다`
              : `${exploreTeamFilter} 팀의 응원가가 없습니다`}
          </p>
          <div className="flex gap-2 justify-center mt-2">
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[#0ea5e9] text-sm">
                검색어 지우기
              </button>
            )}
            {exploreTeamFilter !== '전체' && (
              <button onClick={() => setExploreTeamFilter('전체')} className="text-[#0ea5e9] text-sm">
                전체 팀 보기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
  );
};
export default ExploreTab;
