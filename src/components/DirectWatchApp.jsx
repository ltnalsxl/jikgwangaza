import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  Trophy,
  Search,
  Share2,
  RotateCcw,
  Settings,
  Play,
} from 'lucide-react';

// A simplified demo UI inspired by the design example
const DirectWatchApp = () => {
  const sampleGames = {
    '2025-07-01': { opponent: 'vs 한화', stadium: '잠실', time: '18:30' },
    '2025-07-02': { opponent: 'vs 한화', stadium: '잠실', time: '18:30' },
    '2025-07-03': { opponent: '@ KIA', stadium: '광주', time: '18:30' },
  };

  const [currentDate, setCurrentDate] = useState(new Date(2025, 6, 1));
  const [selectedDate, setSelectedDate] = useState('2025-07-01');
  const [showCalendar, setShowCalendar] = useState(false);
  const [activeTab, setActiveTab] = useState('lineup');

  const lineup = [
    { number: 1, name: '정수빈', position: '중견수' },
    { number: 2, name: '오명진', position: '2루수' },
    { number: 3, name: '케이브', position: '우익수' },
    { number: 4, name: '양의지', position: '포수' },
    { number: 5, name: '김재환', position: '1루수' },
  ];

  const formatDate = (date) => date.toISOString().split('T')[0];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const navigateMonth = (dir) => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + dir);
      return next;
    });
  };

  const handleDateClick = (date) => {
    const dateStr = formatDate(date);
    if (sampleGames[dateStr]) {
      setSelectedDate(dateStr);
      setShowCalendar(false);
    }
  };

  const hasGame = (date) => sampleGames[formatDate(date)];
  const isSelected = (date) => formatDate(date) === selectedDate;
  const getGameInfo = () => sampleGames[selectedDate];
  const formatSelectedDate = () => {
    const date = new Date(selectedDate);
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${m}월 ${d}일 (${days[date.getDay()]})`;
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    '1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'
  ];
  const dayNames = ['일','월','화','수','목','금','토'];

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">두</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">직관가자</h1>
              <p className="text-sm text-gray-500">두산 베어스 • {formatSelectedDate()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <RotateCcw className="w-5 h-5 text-gray-400" />
            <div className="w-6 h-6 bg-gray-800 rounded-full" />
            <Settings className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full px-4 py-3 bg-gray-100 rounded-xl flex items-center justify-between text-left"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">⚾</span>
                <span className="font-medium">{formatSelectedDate()}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {showCalendar && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => navigateMonth(-1)}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h3 className="font-semibold text-gray-800">
                      {currentDate.getFullYear()}년 {monthNames[currentDate.getMonth()]}
                    </h3>
                    <button
                      onClick={() => navigateMonth(1)}
                      className="p-1 hover:bg-gray-100 rounded-full"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map((d) => (
                      <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((date, idx) => {
                      if (!date) return <div key={idx} className="h-8" />;
                      const info = hasGame(date);
                      const selected = isSelected(date);
                      return (
                        <button
                          key={idx}
                          onClick={() => handleDateClick(date)}
                          disabled={!info}
                          className={`h-8 relative rounded-lg text-xs font-medium transition-all ${
                            info ? 'cursor-pointer' : 'cursor-not-allowed'
                          } ${
                            selected
                              ? 'bg-blue-500 text-white'
                              : info
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              : 'text-gray-300'
                          }`}
                        >
                          {date.getDate()}
                          {info && !selected && (
                            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                              <div className="w-1 h-1 bg-blue-400 rounded-full" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
          <button className="px-4 py-3 bg-gray-100 rounded-xl flex items-center justify-between min-w-0 flex-1">
            <span className="font-medium truncate">잠실야구장</span>
            <ChevronDown className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
          </button>
        </div>
      </div>

      <div className="bg-white border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('lineup')}
            className={`flex-1 py-4 flex flex-col items-center space-y-1 ${
              activeTab === 'lineup' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">라인업</span>
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`flex-1 py-4 flex flex-col items-center space-y-1 ${
              activeTab === 'teams' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-sm font-medium">팀응원가</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-4 flex flex-col items-center space-y-1 ${
              activeTab === 'search' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'
            }`}
          >
            <Search className="w-5 h-5" />
            <span className="text-sm font-medium">탐색</span>
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-blue-600">
                두산 vs {getGameInfo()?.opponent.replace('vs ', '').replace('@ ', '')}
              </h2>
              <p className="text-sm text-gray-500">
                미정 • {formatSelectedDate()} • {getGameInfo()?.time || '시간 미정'}
              </p>
            </div>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium">
              전체 재생
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">오늘의 라인업</h3>
              <div className="flex items-center space-x-2">
                <Share2 className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-500 font-medium">공유하기</span>
                <RotateCcw className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
          <div className="space-y-0">
            {lineup.map((player) => (
              <div key={player.number} className="flex items-center justify-between p-4 border-b border-gray-50 last:border-b-0">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">{player.number}</span>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{player.name}</div>
                    <div className="text-sm text-gray-500">{player.position}</div>
                  </div>
                </div>
                <button className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Play className="w-4 h-4 text-white ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectWatchApp;
