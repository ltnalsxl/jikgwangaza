import React, { useEffect, useState } from 'react';

const fetchWeather = async (eqmtId) => {
  const baseUrl = 'http://apis.data.go.kr/1360000/RoadWthrInfoService/getCctvStnRoadWthr';
  const params = new URLSearchParams({
    serviceKey: process.env.REACT_APP_ROAD_API_KEY || '',
    pageNo: '1',
    numOfRows: '1',
    dataType: 'JSON',
    eqmtId,
    hhCode: '00',
  });

  try {
    const res = await fetch(`${baseUrl}?${params.toString()}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const item = data?.response?.body?.items?.item?.[0];
    return item?.weatherNm || '정보없음';
  } catch (err) {
    console.warn('날씨 조회 실패', err);
    return '정보없음';
  }
};

const StadiumWeather = ({ eqmtIds = [] }) => {
  const [results, setResults] = useState([]);

  useEffect(() => {
    const run = async () => {
      const outs = [];
      for (const id of eqmtIds) {
        outs.push({ id, weather: await fetchWeather(id) });
      }
      setResults(outs);
    };
    if (eqmtIds.length > 0) {
      run();
    }
  }, [eqmtIds]);

  if (!eqmtIds.length) return null;

  return (
    <div className="text-sm mb-3" data-testid="stadium-weather">
      <h3 className="font-semibold mb-1">구장 주변 도로 날씨</h3>
      <ul className="list-disc list-inside space-y-1">
        {results.map((r) => (
          <li key={r.id}>
            {r.id}: {r.weather}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StadiumWeather;
