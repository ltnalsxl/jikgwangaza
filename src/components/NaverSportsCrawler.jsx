import React, { useState } from 'react';
import { Search, Download, RefreshCw, Copy, Upload, AlertCircle, CheckCircle, Users, Trophy, Calendar } from 'lucide-react';

const NaverSportsCrawler = () => {
  const [activeTab, setActiveTab] = useState('crawler');
  const [gameUrl, setGameUrl] = useState('');
  const [crawledData, setCrawledData] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [htmlData, setHtmlData] = useState('');

  // 팀 색상 정보
  const getTeamColor = (teamName) => {
    const colors = {
      'NC': '#1d467d',
      'KIA': '#a32525',
      '두산': '#131230',
      'LG': '#c30452',
      '삼성': '#074ca1',
      '롯데': '#041e42',
      'SSG': '#ce0e2d',
      '키움': '#570514',
      '한화': '#ff6600',
      'KT': '#000000'
    };
    return colors[teamName] || '#667eea';
  };

  // URL에서 경기 정보 추출
  const extractGameInfo = (url) => {
    try {
      const urlObj = new URL(url);
      const gameId = urlObj.searchParams.get('gameId');
      const date = urlObj.searchParams.get('date');
      return { gameId, date };
    } catch (e) {
      return null;
    }
  };

  // 크롤링 시뮬레이션 (실제로는 서버에서 처리해야 함)
  const simulateCrawling = async (url) => {
    setLoading(true);
    setError('');

    try {
      // 실제 환경에서는 서버 API를 호출해야 함
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 샘플 크롤링 데이터
      const sampleData = {
        gameInfo: {
          date: '2025-06-13',
          home: 'NC',
          away: 'KIA',
          location: '창원',
          gameId: url.includes('gameId') ? extractGameInfo(url)?.gameId : 'sample123'
        },
        teams: [
          {
            name: 'NC 다이노스',
            color: '#1d467d',
            players: [
              { order: 1, name: '김주원', position: '유격수', isSubstitute: false },
              { order: 2, name: '권희동', position: '좌익수', isSubstitute: false },
              { order: 3, name: '박민우', position: '2루수', isSubstitute: false },
              { order: 4, name: '데이비슨', position: '1루수', isSubstitute: false },
              { order: 5, name: '박건우', position: '우익수', isSubstitute: false },
              { order: 6, name: '손아섭', position: '지명타자', isSubstitute: false },
              { order: 7, name: '천재환', position: '중견수', isSubstitute: false },
              { order: 8, name: '김형준', position: '포수', isSubstitute: false },
              { order: 9, name: '김휘집', position: '3루수', isSubstitute: false }
            ],
            stats: {
              atBats: '19',
              runs: '4',
              hits: '7',
              rbis: '4'
            }
          },
          {
            name: 'KIA 타이거즈',
            color: '#a32525',
            players: [
              { order: 1, name: '이창진', position: '좌익수', isSubstitute: false },
              { order: 2, name: '최원준', position: '우익수', isSubstitute: false },
              { order: 3, name: '최형우', position: '지명타자', isSubstitute: false },
              { order: 4, name: '위즈덤', position: '3루수', isSubstitute: false },
              { order: 5, name: '오선우', position: '1루수', isSubstitute: false },
              { order: 6, name: '박찬호', position: '유격수', isSubstitute: false },
              { order: 7, name: '김호령', position: '중견수', isSubstitute: false },
              { order: 8, name: '김태군', position: '포수', isSubstitute: false },
              { order: 9, name: '김규성', position: '2루수', isSubstitute: false }
            ],
            stats: {
              atBats: '18',
              runs: '1',
              hits: '5',
              rbis: '1'
            }
          }
        ]
      };

      setCrawledData(sampleData);

    } catch (err) {
      setError('크롤링 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // HTML 파싱
  const parseHTMLData = () => {
    if (!htmlData.trim()) {
      setError('HTML 데이터를 입력해주세요.');
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlData, 'text/html');

      const teams = [];
      const teamSections = doc.querySelectorAll('.PlayerRecord_table_area__1fIBC');

      teamSections.forEach(section => {
        const borderColor = section.style.borderTopColor;
        let teamName = '';

        if (borderColor.includes('29, 70, 125')) {
          teamName = 'NC 다이노스';
        } else if (borderColor.includes('163, 37, 37')) {
          teamName = 'KIA 타이거즈';
        } else {
          teamName = '알 수 없는 팀';
        }

        const players = [];
        const playerItems = section.querySelectorAll('.PlayerRecord_player_item__3ECIB:not(.PlayerRecord_type_sum__bKbUH)');

        playerItems.forEach(item => {
          const battingOrderElement = item.querySelector('.PlayerRecord_bat_order__2gZ-S');
          const nameElement = item.querySelector('.PlayerRecord_name__1W_c0');
          const positionElement = item.querySelector('.PlayerRecord_position__3SBbd');
          const substitutionElement = item.querySelector('.PlayerRecord_icon_substitution__h3DpJ');

          if (nameElement) {
            players.push({
              order: battingOrderElement ? battingOrderElement.textContent.trim() : '',
              name: nameElement.textContent.trim(),
              position: positionElement ? positionElement.textContent.trim() : '',
              isSubstitute: substitutionElement !== null
            });
          }
        });

        // 팀 통계
        const stats = {};
        const sumRow = section.querySelector('.PlayerRecord_type_sum__bKbUH');
        if (sumRow) {
          const cells = sumRow.querySelectorAll('td span');
          if (cells.length >= 4) {
            stats.atBats = cells[0]?.textContent || '0';
            stats.runs = cells[1]?.textContent || '0';
            stats.hits = cells[2]?.textContent || '0';
            stats.rbis = cells[3]?.textContent || '0';
          }
        }

        if (players.length > 0) {
          teams.push({
            name: teamName,
            color: getTeamColor(teamName.split(' ')[0]),
            players: players,
            stats: stats
          });
        }
      });

      setParsedData({ teams });
      setError('');

    } catch (err) {
      setError('HTML 파싱 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // JSON 다운로드
  const downloadJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 클립보드 복사
  const copyToClipboard = (data) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      alert('클립보드에 복사되었습니다!');
    });
  };

  // gameLineups.json 형태로 변환
  const convertToGameLineup = (data) => {
    if (!data || !data.teams || data.teams.length === 0) return null;

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    return data.teams.map(team => {
      const teamCode = team.name.split(' ')[0];
      return {
        id: `${dateStr}_${teamCode}`,
        date: dateStr,
        team: teamCode,
        home: data.gameInfo?.home || teamCode,
        away: data.gameInfo?.away || '상대팀',
        location: data.gameInfo?.location || '구장',
        lineup: team.players.map(player => ({
          order: parseInt(player.order) || 0,
          playerName: player.name,
          position: player.position
        })).filter(p => p.order > 0).sort((a, b) => a.order - b.order)
      };
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="w-8 h-8" />
            네이버 스포츠 크롤링 & 파싱 도구
          </h1>
          <p className="mt-2 opacity-90">KBO 경기 데이터를 크롤링하고 파싱하여 JSON으로 변환합니다</p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('crawler')}
            className={`flex-1 py-4 px-6 font-medium transition-all ${
              activeTab === 'crawler'
                ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Search className="w-5 h-5 inline mr-2" />
            URL 크롤링
          </button>
          <button
            onClick={() => setActiveTab('parser')}
            className={`flex-1 py-4 px-6 font-medium transition-all ${
              activeTab === 'parser'
                ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Upload className="w-5 h-5 inline mr-2" />
            HTML 파싱
          </button>
        </div>

        <div className="p-6">
          {/* URL 크롤링 탭 */}
          {activeTab === 'crawler' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">사용법</h3>
                <p className="text-blue-700 text-sm">
                  네이버 스포츠 KBO 경기 페이지 URL을 입력하세요. 
                  예: https://sports.naver.com/game/kbo/index?gameId=20250613KTNC01&date=20250613
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    네이버 스포츠 경기 URL
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="url"
                      value={gameUrl}
                      onChange={(e) => setGameUrl(e.target.value)}
                      placeholder="https://sports.naver.com/game/kbo/index?gameId=..."
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => simulateCrawling(gameUrl)}
                      disabled={loading || !gameUrl}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Search className="w-5 h-5" />
                      )}
                      {loading ? '크롤링 중...' : '크롤링 시작'}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertCircle className="w-5 h-5" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                {crawledData && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-800 mb-2">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-semibold">크롤링 완료!</span>
                      </div>
                      <div className="text-sm text-green-700">
                        경기: {crawledData.gameInfo?.home} vs {crawledData.gameInfo?.away} 
                        ({crawledData.gameInfo?.location}, {crawledData.gameInfo?.date})
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => downloadJSON(crawledData, `game_${crawledData.gameInfo?.date}_raw.json`)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Download className="w-4 h-4" />
                        원본 데이터 다운로드
                      </button>
                      <button
                        onClick={() => {
                          const gameLineup = convertToGameLineup(crawledData);
                          if (gameLineup) downloadJSON(gameLineup, `gameLineups_${crawledData.gameInfo?.date}.json`);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        <Download className="w-4 h-4" />
                        gameLineups.json 형태로 다운로드
                      </button>
                      <button
                        onClick={() => copyToClipboard(crawledData)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        <Copy className="w-4 h-4" />
                        복사
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HTML 파싱 탭 */}
          {activeTab === 'parser' && (
            <div className="space-y-6">
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="font-semibold text-orange-800 mb-2">사용법</h3>
                <p className="text-orange-700 text-sm">
                  네이버 스포츠에서 F12 개발자 도구로 추출한 HTML 코드를 붙여넣으세요.
                  PlayerRecord_table_area__1fIBC 클래스를 포함한 부분을 복사해주세요.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HTML 데이터
                  </label>
                  <textarea
                    value={htmlData}
                    onChange={(e) => setHtmlData(e.target.value)}
                    placeholder="<div class='PlayerRecord_table_area__1fIBC'>...</div>"
                    className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                </div>

                <button
                  onClick={parseHTMLData}
                  disabled={!htmlData.trim()}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  HTML 파싱하기
                </button>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertCircle className="w-5 h-5" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                {parsedData && (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-semibold">파싱 완료! {parsedData.teams.length}개 팀 데이터 추출</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => downloadJSON(parsedData, `parsed_data_${new Date().toISOString().split('T')[0]}.json`)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        <Download className="w-4 h-4" />
                        파싱 데이터 다운로드
                      </button>
                      <button
                        onClick={() => {
                          const gameLineup = convertToGameLineup(parsedData);
                          if (gameLineup) downloadJSON(gameLineup, `gameLineups_${new Date().toISOString().split('T')[0]}.json`);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        <Download className="w-4 h-4" />
                        gameLineups.json 형태로 다운로드
                      </button>
                      <button
                        onClick={() => copyToClipboard(parsedData)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        <Copy className="w-4 h-4" />
                        복사
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 결과 표시 */}
          {(crawledData || parsedData) && (
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-6 h-6" />
                추출된 데이터
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(crawledData?.teams || parsedData?.teams || []).map((team, index) => (
                  <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: team.color }}
                      ></div>
                      <h4 className="text-lg font-bold">{team.name}</h4>
                    </div>

                    {team.stats && (
                      <div className="grid grid-cols-4 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{team.stats.atBats}</div>
                          <div className="text-xs text-gray-500">타수</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{team.stats.runs}</div>
                          <div className="text-xs text-gray-500">득점</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-orange-600">{team.stats.hits}</div>
                          <div className="text-xs text-gray-500">안타</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">{team.stats.rbis}</div>
                          <div className="text-xs text-gray-500">타점</div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {team.players.map((player, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                            player.isSubstitute ? 'bg-red-500' : 'bg-blue-500'
                          }`}>
                            {player.order || '교'}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold">{player.name}</div>
                            <div className="text-sm text-gray-500">{player.position}</div>
                          </div>
                          {player.isSubstitute && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                              교체
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NaverSportsCrawler;
