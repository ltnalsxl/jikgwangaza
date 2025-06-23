import React from 'react';
import YouTube from 'react-youtube';
import { Music } from 'lucide-react';

const TeamChantVideo = React.memo(({ youtubeId, chantTitle, opts }) => {
  if (youtubeId && youtubeId !== '') {
    return (
      <YouTube
        className="w-full h-full"
        key={youtubeId}
        videoId={youtubeId}
        opts={opts}
      />
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-center text-white bg-gray-900 dark:bg-gray-800">
      <div>
        <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg">{chantTitle}</p>
      </div>
    </div>
  );
});

export default TeamChantVideo;
