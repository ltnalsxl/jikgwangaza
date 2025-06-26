import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

const CalendarDropdown = ({ value, onChange, gameDates }) => {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(() => new Date(value));
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

  useEffect(() => {
    setCurrent(new Date(value));
  }, [value]);

  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const formatLabel = (d) => {
    const m = d.getMonth() + 1;
    const dd = d.getDate();
    const name = dayNames[d.getDay()];
    return `${m}월 ${dd}일 (${name})`;
  };

  const prevMonth = () => {
    setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1));
  };

  const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
  const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
  const startDay = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();

  const cells = [];
  for (let i = 0; i < startDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(current.getFullYear(), current.getMonth(), d));
  }

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-xl px-4 py-2 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
      >
        {formatLabel(new Date(value))}
        <ChevronDown className="w-4 h-4 ml-2" />
      </button>
        {open && (
        <div className="absolute z-10 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 w-72">
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">
              {current.getFullYear()}년 {current.getMonth() + 1}월
            </span>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs text-center mb-1">
            {dayNames.map((d) => (
              <div key={d} className="font-medium">
                {d}
              </div>
            ))}
            {cells.map((date, idx) => {
              if (!date) return <div key={idx} />;
              const formatted = formatDate(date);
              const hasGame = gameDates?.has(formatted);
              const selected = value && isSameDay(date, new Date(value));
              return (
                <button
                  key={idx}
                  onClick={() => {
                    onChange(formatted);
                    setOpen(false);
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                    selected
                      ? 'bg-blue-500 text-white'
                      : hasGame
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : ''
                  } hover:bg-blue-200 dark:hover:bg-blue-700`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarDropdown;
