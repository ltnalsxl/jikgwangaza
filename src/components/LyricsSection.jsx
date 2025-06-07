import React, { useState } from 'react';
import { Music } from 'lucide-react';

const LyricsSection = ({ chant, hasVideo }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!chant.lyrics) return null;

  return (
    <div className="p-4">
      {hasVideo ? (
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors mb-3 font-medium"
          >
            <Music className="w-4 h-4" />
            {isExpanded ? '가사 숨기기' : '가사 보기'}
          </button>
          {isExpanded && (
            <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap text-gray-800 leading-relaxed border border-gray-200">
              {chant.lyrics}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 text-gray-700 mb-3 font-medium">
            <Music className="w-4 h-4" />
            응원가 가사
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap text-gray-800 leading-relaxed border border-gray-200">
            {chant.lyrics}
          </div>
        </div>
      )}
    </div>
  );
};

export default LyricsSection;
