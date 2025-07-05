import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.pageYOffset > 300) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 p-3 bg-gray-600 text-white rounded-full shadow-lg transition-opacity ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-label="맨 위로"
    >
      <ChevronUp className="w-5 h-5" />
    </button>
  );
};

export default ScrollToTopButton;
