import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { getTeamInfo } from '../utils/team';

const teams = ['KIA','두산','LG','삼성','롯데','SSG','키움','한화','NC','KT'];

const TeamDropdown = ({ value, onChange }) => {
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
        className="flex items-center bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm rounded-xl px-4 py-2 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
      >
        {getTeamInfo(value).fullName}
        <ChevronDown className="w-4 h-4 ml-2" />
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1 text-sm">
          {teams.map(team => (
            <button
              key={team}
              onClick={() => {
                onChange(team);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {getTeamInfo(team).fullName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamDropdown;
