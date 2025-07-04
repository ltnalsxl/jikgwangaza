import React, { useState, useEffect } from 'react';
import { Share2, X } from 'lucide-react';

const AddToHomePopup = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const hideUntil = localStorage.getItem('hideAddToHomePopup');
      if (!hideUntil || Date.now() > Number(hideUntil)) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const hideForDay = () => {
    const expire = Date.now() + 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem('hideAddToHomePopup', String(expire));
    } catch {
      // ignore write errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  const isIosSafari =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/i.test(navigator.userAgent);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
      <div className="pointer-events-auto w-full">
        <div className="relative bg-black bg-opacity-80 dark:bg-black/80 text-white rounded-t-2xl px-4 pt-6 pb-4">
          <button
            aria-label="닫기"
            onClick={() => setVisible(false)}
            className="absolute top-2 right-4 text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <p className="text-center text-sm mb-4">
            공유 {isIosSafari ? '⬆️' : <Share2 className="inline w-4 h-4 mx-1" />} 아이콘을 누르고 홈 화면에 추가를 선택해 주세요.
          </p>
          <button
            onClick={hideForDay}
            className="w-full bg-gray-700 hover:bg-gray-600 rounded-lg py-2 text-sm"
          >
            오늘 하루 안보기
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddToHomePopup;
