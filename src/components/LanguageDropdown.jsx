import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

const LanguageDropdown = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-sm"
      >
        {value === 'en' ? 'EN' : 'KO'}
        <ChevronDown className="w-4 h-4 ml-1" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-28 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1 text-sm z-[9999]">
          <button
            onClick={() => { onChange('ko'); setOpen(false); }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            한국어
          </button>
          <button
            onClick={() => { onChange('en'); setOpen(false); }}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            English
          </button>
        </div>
      )}
    </div>
  );
};

export default LanguageDropdown;
