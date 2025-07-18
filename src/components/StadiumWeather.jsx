import React, { useEffect, useState } from 'react';

const StadiumWeather = ({ eqmtIds = [] }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const base = process.env.PUBLIC_URL || '';
        const res = await fetch(`${base}/data/kboBallparkWeather.json`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.warn('날씨 데이터 로드 실패', err);
      }
    };
    load();
  }, []);

  if (!eqmtIds.length || !data) return null;

  const items = data.data.filter((d) => eqmtIds.includes(d.eqmtId));
  if (items.length === 0) return null;

  const timeStr = data.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
    : null;

  const iconMap = {
    맑음: '☀️',
    '구름많음': '⛅',
    '구름 많음': '⛅',
    흐림: '☁️',
    비: '🌧️',
    눈: '❄️',
    '눈/비': '🌨️',
    정보없음: '❓',
  };

  const getIcon = (name) => iconMap[name] || '🌡️';

  return (
    <div className="text-sm mb-3" data-testid="stadium-weather">
      <h3 className="font-semibold mb-1">구장 주변 도로 날씨</h3>
      <ul className="list-disc list-inside space-y-1">
        {items.map((r) => (
          <li key={r.eqmtId}>
            ⚾ {r.stadium} {getIcon(r.weatherNm)} {r.weatherNm}
            {timeStr ? ` (기준 시각: ${timeStr})` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StadiumWeather;
