import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, Trophy, Search, X } from 'lucide-react';
import LyricsSection from './LyricsSection';
import TeamChantVideo from './TeamChantVideo';
import { getTeamInfo } from '../utils/team';
import { hexToRgba } from '../utils/color';
import ScrollToTopButton from './ScrollToTopButton';
import { searchChants, highlight } from '../utils/search';

const TeamChantsTab = ({
  teamChants,
  selectedTeam,
  setSelectedDate,
  fetchJsonData,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [activeChantId, setActiveChantId] = useState(null);
  const activeChantRef = useRef(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedTerm(searchTerm), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);
  const baseTeamChants = teamChants.filter((chant) => chant.team === selectedTeam);

  const filteredChants = useMemo(
    () => (debouncedTerm ? searchChants(baseTeamChants, debouncedTerm) : baseTeamChants),
    [baseTeamChants, debouncedTerm]
  );

  const situationPriority = ['1회', '대표 응원가'];

  const sortedTeamChants = filteredChants.slice().sort((a, b) => {
    const idxA = situationPriority.indexOf(a.situation);
    const idxB = situationPriority.indexOf(b.situation);
    if (idxA === -1 && idxB === -1) {
      return (a.situation || '').localeCompare(b.situation || '');
    }
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  const chantsBySituation = sortedTeamChants.reduce((acc, chant) => {
    const situation = chant.situation || '기본 응원가';
    if (!acc[situation]) acc[situation] = [];
    acc[situation].push(chant);
    return acc;
  }, {});

  const activeChant = activeChantId
    ? teamChants.find((c) => c.id === activeChantId)
    : null;

  useEffect(() => {
    if (activeChantId && activeChantRef.current) {
      activeChantRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [activeChantId]);

  const opts = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      mute: 0,
      controls: 1,
      rel: 0,
    },
  };


  const getSnippet = (lyrics, term) => {
    if (!lyrics) return '';
    const lower = lyrics.toLowerCase();
    const q = term.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx === -1) return lyrics.split('\n')[0].slice(0, 50);
    const start = Math.max(0, idx - 20);
    const end = idx + term.length + 20;
    return lyrics.slice(start, end).replace(/\n/g, ' ');
  };



  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {selectedTeam} 팀 응원가
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {filteredChants.length}개
          </span>
          <button
            onClick={() => {
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, '0');
              const dd = String(today.getDate()).padStart(2, '0');
              setSelectedDate(`${yyyy}-${mm}-${dd}`);
              fetchJsonData();
            }}
            className="p-2 text-blue-600 hover:text-blue-800 transition-colors hover:bg-blue-50 rounded-full"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            aria-label="검색어 삭제"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="응원가 제목이나 가사로 검색하세요"
          aria-label="응원가 검색"
          className="w-full pl-9 pr-9 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filteredChants.length > 0 && (
        <div className="flex gap-2 flex-wrap overflow-x-auto pb-2">
          {sortedTeamChants.map((chant) => {
            const isMain = chant.situation === '대표 응원가';
            return (
              <button
                key={chant.id}
                onClick={() => setActiveChantId(chant.id)}
                className={`text-xs px-3 py-1 border rounded-lg whitespace-nowrap ${isMain ? 'text-black' : 'text-gray-900'}`}
                style={
                  isMain
                    ? {
                        backgroundColor: hexToRgba(
                          getTeamInfo(selectedTeam).color,
                          0.3
                        ),
                        borderColor: getTeamInfo(selectedTeam).color,
                      }
                    : {}
                }
              >
                {chant.chantTitle}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">팀 응원가를 불러오는 중...</p>
        </div>
      ) : activeChant ? (
        <div className="space-y-4">
          <button
            onClick={() => setActiveChantId(null)}
            className="text-blue-600 hover:text-blue-800 transition-colors mb-4"
          >
            목록으로
          </button>
          <div
            id={`chant-${activeChant.id}`}
            ref={activeChantRef}
            className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <div className="p-4 pb-2">
              <h4
                className="font-bold text-lg"
                dangerouslySetInnerHTML={{ __html: highlight(activeChant.chantTitle, debouncedTerm) }}
              />
              {debouncedTerm && (
                <p
                  className="text-sm text-gray-600 mt-1"
                  dangerouslySetInnerHTML={{ __html: highlight(getSnippet(activeChant.lyrics || '', debouncedTerm), debouncedTerm) }}
                />
              )}
            </div>
            <div className="w-full aspect-video">
              <TeamChantVideo
                youtubeId={activeChant.youtubeId}
                chantTitle={activeChant.chantTitle}
                opts={opts}
              />
            </div>
            <LyricsSection chant={activeChant} hasVideo={activeChant.youtubeId && activeChant.youtubeId !== ''} />
          </div>
        </div>
      ) : baseTeamChants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{selectedTeam} 팀의 응원가가 없습니다</p>
          <p className="text-sm mt-2">곧 추가될 예정입니다!</p>
        </div>
      ) : filteredChants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>검색 결과가 없습니다</p>
        </div>
      ) : (
        Object.entries(chantsBySituation).map(([situation, chants]) => (
          <div key={situation} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 border-b pb-2 flex items-center gap-2">
              {getTeamInfo(selectedTeam).logo ? (
                <img
                  src={getTeamInfo(selectedTeam).logo}
                  alt={selectedTeam}
                  className="w-5 h-5 object-contain"
                />
              ) : (
                <Trophy className="w-5 h-5" style={{ color: getTeamInfo(selectedTeam).color }} />
              )}
              {situation}
            </h3>

            {chants.map((chant) => (
              <div
                key={chant.id}
                id={`chant-${chant.id}`}
                className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <div className="p-4 pb-2">
                  <h4
                    className="font-bold text-lg"
                    dangerouslySetInnerHTML={{ __html: highlight(chant.chantTitle, debouncedTerm) }}
                  />
                  {debouncedTerm && (
                    <p
                      className="text-sm text-gray-600 mt-1"
                      dangerouslySetInnerHTML={{ __html: highlight(getSnippet(chant.lyrics || '', debouncedTerm), debouncedTerm) }}
                    />
                  )}
                </div>
                <div className="w-full aspect-video">
                  <TeamChantVideo
                    youtubeId={chant.youtubeId}
                    chantTitle={chant.chantTitle}
                    opts={opts}
                  />
                </div>
                <LyricsSection chant={chant} hasVideo={chant.youtubeId && chant.youtubeId !== ''} />
              </div>
            ))}
          </div>
        ))
      )}
      <ScrollToTopButton />
    </div>
  );
};

export default TeamChantsTab;
