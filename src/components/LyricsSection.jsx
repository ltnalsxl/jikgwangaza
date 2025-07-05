import React, { useState } from 'react';
import { Music } from 'lucide-react';

const LyricsSection = ({ chant, hasVideo, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!chant.lyrics) return null;

  return (
    <div className="p-4">
      {hasVideo ? (
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 transition-colors mb-3 font-medium"
          >
            <Music className="w-4 h-4" />
            {isExpanded ? '가사 숨기기' : '가사 보기'}
          </button>
          {isExpanded && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-100 leading-relaxed border border-gray-200 dark:border-gray-700">
              {chant.lyrics}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-3 font-medium">
            <Music className="w-4 h-4" />
            응원가 가사
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-100 leading-relaxed border border-gray-200 dark:border-gray-700">
            {chant.lyrics}
          </div>
        </div>
      )}
    </div>
  );
};

export default LyricsSection;
