import React from 'react';
import { getTeamInfo } from '../utils/team';

const teams = ['KIA', '두산', 'LG', '삼성', '롯데', 'SSG', '키움', '한화', 'NC', 'KT'];

const TeamSelectModal = ({ onSelect }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl m-4 p-4 w-full max-w-md">
        <h2 className="text-lg font-bold text-center mb-4">응원팀을 선택하세요</h2>
        <div className="grid grid-cols-5 gap-4 mb-4">
          {teams.map((team) => (
            <button
              key={team}
              onClick={() => onSelect(team)}
              className="flex flex-col items-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2"
            >
              {getTeamInfo(team).logo && (
                <img
                  src={getTeamInfo(team).logo}
                  alt={team}
                  className="team-logo w-10 h-10 object-contain"
                />
              )}
              <span className="text-xs mt-1 whitespace-nowrap">
                {getTeamInfo(team).text || team}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => onSelect('none')}
          className="w-full bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg py-2 text-sm"
        >
          아직 응원팀이 없어요
        </button>
      </div>
    </div>
  );
};

export default TeamSelectModal;
