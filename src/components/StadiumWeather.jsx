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

  const timeLabel = data.updatedAt
    ? `기준 시각: ${new Date(data.updatedAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : null;

  return (
    <div className="text-sm mb-3" data-testid="stadium-weather">
      <h3 className="font-semibold mb-1">구장 주변 도로 날씨</h3>
      {timeLabel && <p className="text-gray-500 mb-1">{timeLabel}</p>}
      <ul className="list-disc list-inside space-y-1">
        {items.map((r) => (
          <li key={r.eqmtId}>
            {r.stadium}: {r.weatherNm}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StadiumWeather;
