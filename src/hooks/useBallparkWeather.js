import { useEffect, useState } from 'react';

const useBallparkWeather = () => {
  const [map, setMap] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const base = process.env.PUBLIC_URL || '';
        const res = await fetch(`${base}/data/kboBallparkWeather.json`);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        const m = {};
        if (Array.isArray(json.data)) {
          json.data.forEach((d) => {
            m[d.stadium] = d.weatherNm;
          });
        }
        setMap(m);
      } catch (err) {
        console.warn('날씨 데이터 로드 실패', err);
      }
    };
    load();
  }, []);

  return map;
};

export default useBallparkWeather;
