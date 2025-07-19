import React from 'react';
import { X } from 'lucide-react';

const BallparkWeatherModal = ({ forecast, updatedAt, onClose }) => {
  if (!forecast) return null;

  const skyMap = { '1': '맑음', '3': '구름많음', '4': '흐림' };
  const ptyMap = { '0': '', '1': '비', '2': '비/눈', '3': '눈', '4': '소나기' };

  const entries = Object.entries(forecast.forecasts || {}).sort(
    ([a], [b]) => parseInt(a) - parseInt(b)
  );

  const formatUpdatedAt = (iso) => {
    try {
      const d = new Date(iso);
      if (isNaN(d)) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}년 ${m}월 ${day}일 ${h}시 ${min}분`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl m-4 p-4 w-full max-w-md">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-lg">{forecast.stadium} 날씨</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        {updatedAt && (
          <p className="text-right text-xs text-gray-500 dark:text-gray-400 mb-2">
            {formatUpdatedAt(updatedAt)} 기준
          </p>
        )}
        <div className="overflow-y-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
                <th className="p-2 text-center">시간</th>
                <th className="p-2 text-center">날씨</th>
                <th className="p-2 text-center">기온</th>
                <th className="p-2 text-center">강수확률</th>
                <th className="p-2 text-center">강수량</th>
                <th className="p-2 text-center">습도</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map(([time, d]) => {
                const sky = skyMap[d.SKY] || '';
                const pty = ptyMap[d.PTY] || '';
                const pcp = d.PCP && d.PCP !== '강수없음' ? d.PCP : '';
                return (
                  <tr key={time} className="bg-white dark:bg-gray-800">
                    <td className="p-2 text-center">{time.slice(0,2)}:{time.slice(2)}</td>
                    <td className="p-2 text-center">{sky}{pty ? ` ${pty}` : ''}</td>
                    <td className="p-2 text-center">{d.TMP}℃</td>
                    <td className="p-2 text-center">{d.POP}%</td>
                    <td className="p-2 text-center">{pcp}</td>
                    <td className="p-2 text-center">{d.REH}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BallparkWeatherModal;
