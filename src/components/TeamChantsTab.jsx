import React from 'react';
import { RefreshCw, Trophy } from 'lucide-react';
import LyricsSection from './LyricsSection';
import TeamChantVideo from './TeamChantVideo';
import { getTeamInfo } from '../utils/team';

const TeamChantsTab = ({
  teamChants,
  selectedTeam,
  setSelectedDate,
  fetchJsonData,
  loading,
}) => {
  const currentTeamChants = teamChants.filter((chant) => chant.team === selectedTeam);

  const chantsBySituation = currentTeamChants.reduce((acc, chant) => {
    const situation = chant.situation || '기본 응원가';
    if (!acc[situation]) acc[situation] = [];
    acc[situation].push(chant);
    return acc;
  }, {});

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {selectedTeam} 팀 응원가
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {currentTeamChants.length}개
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

      {loading ? (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">팀 응원가를 불러오는 중...</p>
        </div>
      ) : currentTeamChants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{selectedTeam} 팀의 응원가가 없습니다</p>
          <p className="text-sm mt-2">곧 추가될 예정입니다!</p>
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
              <div key={chant.id} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-4 pb-2">
                  <h4 className="font-bold text-lg">{chant.chantTitle}</h4>
                </div>
                <div className="relative w-full" style={{ paddingBottom: '56.25%', height: 0 }}>
                  <div className="absolute top-0 left-0 w-full h-full z-0">
                    <TeamChantVideo youtubeId={chant.youtubeId} chantTitle={chant.chantTitle} opts={opts} />
                  </div>
                </div>
                <LyricsSection chant={chant} hasVideo={chant.youtubeId && chant.youtubeId !== ''} />
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
};

export default TeamChantsTab;
