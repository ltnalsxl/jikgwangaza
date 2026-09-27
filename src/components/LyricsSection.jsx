import React, { useState } from 'react';
import { Music } from 'lucide-react';

const TEAM_FULL = {
  KIA: 'KIA 타이거즈', 삼성: '삼성 라이온즈', LG: 'LG 트윈스', 두산: '두산 베어스', KT: 'kt wiz',
  SSG: 'SSG 랜더스', 롯데: '롯데 자이언츠', 한화: '한화 이글스', NC: 'NC 다이노스', 키움: '키움 히어로즈',
};

const LyricsAttribution = ({ chant }) => {
  if (chant.lyricsSource !== 'namu.wiki') return null;
  const page = TEAM_FULL[chant.team];
  const href = page
    ? `https://namu.wiki/w/${encodeURIComponent(`${page}/응원가/선수`)}`
    : 'https://namu.wiki';
  return (
    <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
      가사 출처:{' '}
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-gray-300">
        나무위키
      </a>{' '}
      (CC BY-NC-SA 2.0 KR)
    </p>
  );
};

const LyricsSection = ({ chant, hasVideo, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!chant.lyrics) return null;

  return (
    <div className="p-4">
      {hasVideo ? (
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors mb-3 font-medium"
          >
            <Music className="w-4 h-4" />
            {isExpanded ? '가사 숨기기' : '가사 보기'}
          </button>
          {isExpanded && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-100 leading-relaxed border border-gray-200 dark:border-gray-700">
              {chant.lyrics}
              <LyricsAttribution chant={chant} />
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
            <LyricsAttribution chant={chant} />
          </div>
        </div>
      )}
    </div>
  );
};

export default LyricsSection;
