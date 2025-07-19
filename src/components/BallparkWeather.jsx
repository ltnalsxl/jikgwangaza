import React from 'react';
import { MapPin } from 'lucide-react';

const BallparkWeather = ({ forecast, gameTime }) => {
  if (!forecast || !gameTime) return null;

  const parseMinutes = (t) => {
    const str = t.toString().padStart(4, '0');
    return parseInt(str.slice(0, 2), 10) * 60 + parseInt(str.slice(2), 10);
  };

  const match = gameTime.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const gameMin = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);

  const times = Object.keys(forecast.forecasts || {});
  if (times.length === 0) return null;
  let selected = times[0];
  let minDiff = Math.abs(parseMinutes(selected) - gameMin);
  times.forEach((t) => {
    const diff = Math.abs(parseMinutes(t) - gameMin);
    if (diff < minDiff) {
      selected = t;
      minDiff = diff;
    }
  });

  const data = forecast.forecasts[selected];
  if (!data) return null;

  const skyMap = { '1': '맑음', '3': '구름많음', '4': '흐림' };
  const ptyMap = { '0': '', '1': '비', '2': '비/눈', '3': '눈', '4': '소나기' };

  const sky = skyMap[data.SKY] || '';
  const pty = ptyMap[data.PTY] || '';
  const timeLabel = `${selected.slice(0, 2)}:${selected.slice(2)}`;

  return (
    <div className="mt-3 text-sm bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
      <div className="flex items-center gap-1 font-semibold mb-1">
        <MapPin className="w-4 h-4" />
        {forecast.stadium} {timeLabel}
      </div>
      <div className="flex gap-2 flex-wrap">
        <span>{sky}{pty ? ` ${pty}` : ''}</span>
        <span>{data.TMP}℃</span>
        <span>강수확률 {data.POP}%</span>
        {data.PCP && data.PCP !== '강수없음' && <span>{data.PCP}</span>}
        <span>습도 {data.REH}%</span>
        {data.WSD && <span>풍속 {data.WSD}m/s</span>}
      </div>
    </div>
  );
};

export default BallparkWeather;
