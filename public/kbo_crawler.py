import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
from datetime import datetime, timedelta
import json
import re
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import os
import argparse
import logging
import subprocess

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('kbo_crawler.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class NaverKBOAllLineupCrawler:
    def __init__(self, save_dir='public/data/kbo_crawler_data'):
        self.base_url = "https://m.sports.naver.com"
        self.api_base_url = "https://api-gw.sports.naver.com"
        self.save_dir = save_dir
        self.driver = None
        self.wait = None
        self.driver_setup_attempted = False
        self.all_data = []
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 "
                "Mobile/15E148 Safari/604.1"
            ),
            "Accept": "application/json, text/plain, */*",
            "Referer": self.base_url,
        })
        
        # 저장 디렉토리 생성
        os.makedirs(save_dir, exist_ok=True)
        print(f"📁 설정된 저장 경로: {save_dir}")
        print(f"📁 절대 경로: {os.path.abspath(save_dir)}")
        
    def setup_driver(self, headless=True):
        self.driver_setup_attempted = True
        options = webdriver.ChromeOptions()
        if headless:
            options.add_argument('--headless=new')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=390,844')  # iPhone 12 Pro 크기
        options.add_argument('--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1')
        
        # 자동화 감지 방지
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=options)
        self.driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
            'source': '''
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                })
            '''
        })
        
        self.wait = WebDriverWait(self.driver, 30)  # 대기 시간 30초로 증가
        self.driver.implicitly_wait(10)

    def ensure_driver(self):
        if self.driver is not None:
            return True

        if self.driver_setup_attempted:
            return False

        try:
            self.setup_driver()
            return True
        except Exception as e:
            print(f"❌ 드라이버 초기화 실패: {e}")
            self.driver = None
            self.wait = None
            return False

    def _find_first(self, root, selectors):
        """여러 selector 중 먼저 매칭되는 element를 반환"""
        for by, value in selectors:
            try:
                return root.find_element(by, value)
            except NoSuchElementException:
                continue
        raise NoSuchElementException(f"no selector matched: {selectors}")

    def _find_all_first(self, root, selectors):
        """여러 selector 중 첫 번째로 결과가 있는 목록을 반환"""
        for by, value in selectors:
            elements = root.find_elements(by, value)
            if elements:
                return elements
        return []

    def _wait_for_any(self, selectors, timeout=30):
        wait = WebDriverWait(self.driver, timeout)

        def _locate(driver):
            for by, value in selectors:
                elements = driver.find_elements(by, value)
                if elements:
                    return elements[0]
            return False

        return wait.until(_locate)

    def _wait_for_all(self, selectors, timeout=30):
        wait = WebDriverWait(self.driver, timeout)

        def _locate(driver):
            for by, value in selectors:
                elements = driver.find_elements(by, value)
                if elements:
                    return elements
            return False

        return wait.until(_locate)

    def _extract_game_code(self, href):
        match = re.search(r"/game/([^/?#]+)", href or "")
        return match.group(1) if match else ""

    def _is_probable_kbo_game_code(self, game_code):
        return bool(re.match(r"^\d{8}[A-Z]{4}0\d{4}$", game_code or ""))

    def _extract_text_by_selectors(self, root, selectors, default=""):
        try:
            return self._find_first(root, selectors).text.strip()
        except NoSuchElementException:
            return default

    def _is_lineup_parse_successful(self, starting_lineups):
        if len(starting_lineups) < 2:
            return False

        complete_teams = 0
        for team_data in starting_lineups.values():
            if (
                team_data.get('team_name')
                and team_data.get('starting_pitcher')
                and len(team_data.get('starting_batters', [])) >= 9
            ):
                complete_teams += 1

        return complete_teams >= 2

    def _api_get_json(self, path):
        url = path if path.startswith("http") else f"{self.api_base_url}{path}"
        response = self.session.get(url, timeout=15)
        response.raise_for_status()
        payload = response.json()

        if not payload.get("success"):
            raise ValueError(payload.get("message", "Unknown API error"))

        return payload.get("result", {})

    def _build_today_games_fields(self):
        return (
            "basic,superCategoryId,categoryName,upperCategoryId,upperCategoryName,"
            "stadium,statusNum,gameOnAir,hasVideo,title,specialMatchInfo,roundCode,"
            "seriesOutcome,seriesGameNo,timeTbd,homeStarterName,awayStarterName,"
            "winPitcherName,losePitcherName,homeCurrentPitcherName,"
            "awayCurrentPitcherName,broadChannel,matchRound,roundTournamentInfo,"
            "phaseCode,groupName,leg,hasPtSore,homePtScore,awayPtScore,league,"
            "leagueName,aggregateWinner,neutralGround,postponed,conference,round,"
            "groupName,round,generalInfo3,manualRelayUrl,tennis,ufc"
        )

    def _normalize_team_entry(self, code, short_name, full_name, is_home, score="-"):
        return {
            'name': short_name or full_name or code or "",
            'full_name': full_name or short_name or code or "",
            'code': code or "",
            'score': score,
            'is_home': is_home,
        }

    def _parse_preview_lineup_players(self, players):
        starting_pitcher = None
        starting_batters = []

        for player in players or []:
            position_name = (player.get("positionName") or "").strip()
            raw_position = str(player.get("position") or "").strip()
            batting_order = player.get("batorder")
            player_code = str(player.get("playerCode") or "")
            player_name = (player.get("playerName") or "").strip()
            bats_throws = (player.get("batsThrows") or "").strip()

            if not player_name:
                continue

            if "선발투수" in position_name:
                starting_pitcher = {
                    'player_id': player_code,
                    'name': player_name,
                    'throwing_hand': bats_throws,
                    'position': '투수',
                    'role': '선발투수'
                }
                continue

            parsed_batting_order = None
            if isinstance(batting_order, int):
                parsed_batting_order = batting_order
            elif isinstance(batting_order, str) and batting_order.isdigit():
                parsed_batting_order = int(batting_order)
            elif raw_position.isdigit() and 1 <= int(raw_position) <= 9:
                parsed_batting_order = int(raw_position)

            if parsed_batting_order and 1 <= parsed_batting_order <= 9:
                starting_batters.append({
                    'player_id': player_code,
                    'name': player_name,
                    'batting_order': parsed_batting_order,
                    'position': position_name,
                    'batting_hand': bats_throws,
                    'role': '선발타자'
                })

        starting_batters.sort(key=lambda x: x['batting_order'])
        return starting_pitcher, starting_batters

    def _build_team_lineup_from_preview(self, team_meta, team_lineup):
        players = (team_lineup or {}).get("fullLineUp") or []
        starting_pitcher, starting_batters = self._parse_preview_lineup_players(players)

        return {
            'team_name': team_meta.get('name', ''),
            'team_code': team_meta.get('code', ''),
            'starting_pitcher': starting_pitcher,
            'starting_batters': starting_batters
        }

    def _parse_record_starting_pitcher(self, pitchers, fallback_player_id="", fallback_name=""):
        starter = (pitchers or [None])[0] or {}
        name = starter.get("name") or fallback_name
        player_code = str(starter.get("pcode") or fallback_player_id or "")

        if not name:
            return None

        return {
            'player_id': player_code,
            'name': name,
            'throwing_hand': '',
            'position': '투수',
            'role': '선발투수'
        }

    def _parse_record_starting_batters(self, batters):
        starters_by_order = {}

        for batter in batters or []:
            batting_order = batter.get("batOrder")
            if not isinstance(batting_order, int) or not 1 <= batting_order <= 9:
                continue

            existing = starters_by_order.get(batting_order)
            is_substitute = bool(batter.get("substituteIn"))
            if existing and existing.get("_prefer"):
                continue

            starters_by_order[batting_order] = {
                'player_id': str(batter.get("playerCode") or ""),
                'name': batter.get("name") or "",
                'batting_order': batting_order,
                'position': batter.get("pos") or "",
                'batting_hand': '',
                'role': '선발타자',
                '_prefer': not is_substitute,
            }

        starting_batters = []
        for batting_order in range(1, 10):
            batter = starters_by_order.get(batting_order)
            if batter:
                batter.pop('_prefer', None)
                starting_batters.append(batter)

        return starting_batters

    def _build_team_lineup_from_record(
        self,
        team_meta,
        batters,
        pitchers,
        fallback_pitcher_id="",
        fallback_pitcher_name="",
    ):
        return {
            'team_name': team_meta.get('name', ''),
            'team_code': team_meta.get('code', ''),
            'starting_pitcher': self._parse_record_starting_pitcher(
                pitchers,
                fallback_player_id=fallback_pitcher_id,
                fallback_name=fallback_pitcher_name,
            ),
            'starting_batters': self._parse_record_starting_batters(batters),
        }

    def _map_today_game_from_api(self, date, game):
        away_team = self._normalize_team_entry(
            game.get("awayTeamCode"),
            game.get("awayTeamName"),
            game.get("awayTeamName"),
            False,
            str(game.get("awayTeamScore", "-")),
        )
        home_team = self._normalize_team_entry(
            game.get("homeTeamCode"),
            game.get("homeTeamName"),
            game.get("homeTeamName"),
            True,
            str(game.get("homeTeamScore", "-")),
        )

        game_datetime = game.get("gameDateTime") or ""
        game_time = ""
        if "T" in game_datetime:
            game_time = game_datetime.split("T", 1)[1][:5]

        return {
            'date': date,
            'game_code': game.get("gameId", ""),
            'game_time': game_time,
            'game_status': game.get("statusInfo") or game.get("statusCode") or "",
            'teams': [away_team, home_team],
            'lineup_url': f"{self.base_url}/game/{game.get('gameId', '')}/lineup",
            'stadium': game.get("stadium", ""),
            'away_starter_name': game.get("awayStarterName", ""),
            'home_starter_name': game.get("homeStarterName", ""),
            'broadcast_channel': game.get("broadChannel", ""),
        }

    def get_daily_games_via_api(self, date):
        query = (
            f"/schedule/today-games?fields={self._build_today_games_fields()}"
            f"&superCategoryId=&upperCategoryId=kbaseball&categoryId=kbo&date={date}"
        )
        result = self._api_get_json(query)
        games = result.get("games") or []
        return [
            self._map_today_game_from_api(date, game)
            for game in games
            if game.get("categoryId") == "kbo"
        ]

    def enrich_game_data_via_api(self, game_data):
        game_code = game_data.get('game_code')
        if not game_code:
            return game_data

        try:
            result = self._api_get_json(f"/schedule/games/{game_code}")
            game_info = result.get("game") or result.get("gameInfo") or result

            away_team = self._normalize_team_entry(
                game_info.get("awayTeamCode") or game_info.get("aCode"),
                game_info.get("awayTeamName") or game_info.get("aName"),
                game_info.get("awayTeamFullName") or game_info.get("aFullName"),
                False,
                str(game_info.get("awayTeamScore", "-")),
            )
            home_team = self._normalize_team_entry(
                game_info.get("homeTeamCode") or game_info.get("hCode"),
                game_info.get("homeTeamName") or game_info.get("hName"),
                game_info.get("homeTeamFullName") or game_info.get("hFullName"),
                True,
                str(game_info.get("homeTeamScore", "-")),
            )

            enriched = dict(game_data)
            if away_team.get("name") and home_team.get("name"):
                enriched['teams'] = [away_team, home_team]
            enriched['game_status'] = (
                game_info.get("statusInfo")
                or game_info.get("statusCode")
                or enriched.get('game_status', '')
            )
            enriched['game_time'] = game_info.get("gameTime") or game_info.get("gtime") or enriched.get('game_time', '')
            enriched['stadium'] = game_info.get("stadium") or enriched.get('stadium', '')
            enriched['away_starter_name'] = game_info.get("awayStarterName") or enriched.get('away_starter_name', '')
            enriched['home_starter_name'] = game_info.get("homeStarterName") or enriched.get('home_starter_name', '')
            return enriched
        except Exception as e:
            logger.warning(f"경기 API 메타데이터 조회 실패 ({game_code}): {e}")
            return game_data

    def get_lineup_info_via_api(self, game_data):
        game_code = game_data.get('game_code')
        if not game_code:
            return None

        try:
            lineup_result = self._api_get_json(f"/schedule/games/{game_code}/lineup")
            line_up_data = lineup_result.get("lineUpData")
            if line_up_data:
                logger.info(f"라인업 API 응답 확보: {game_code}")
        except Exception as e:
            logger.warning(f"라인업 API 조회 실패 ({game_code}): {e}")
            line_up_data = None

        try:
            preview_result = self._api_get_json(f"/schedule/games/{game_code}/preview")
        except Exception as e:
            logger.warning(f"프리뷰 API 조회 실패 ({game_code}): {e}")
            preview_result = {}

        preview_data = preview_result.get("previewData") or {}
        game_info = preview_data.get("gameInfo") or {}

        away_team = self._normalize_team_entry(
            game_info.get("aCode"),
            game_info.get("aName"),
            game_info.get("aFullName"),
            False,
        )
        home_team = self._normalize_team_entry(
            game_info.get("hCode"),
            game_info.get("hName"),
            game_info.get("hFullName"),
            True,
        )

        teams = game_data.get('teams', [])
        if len(teams) >= 2:
            away_team = {**away_team, **teams[0]}
            home_team = {**home_team, **teams[1]}

        starting_lineups = {
            'team_1': self._build_team_lineup_from_preview(
                away_team,
                preview_data.get("awayTeamLineUp") or {}
            ),
            'team_2': self._build_team_lineup_from_preview(
                home_team,
                preview_data.get("homeTeamLineUp") or {}
            ),
        }

        if self._is_lineup_parse_successful(starting_lineups):
            return {
                **game_data,
                'teams': [away_team, home_team],
                'stadium': game_info.get("stadium", game_data.get('stadium', '')),
                'starting_lineups': starting_lineups,
                'lineup_status': 'confirmed',
                'lineup_source': 'naver_api_preview',
                'crawl_time': datetime.now().isoformat()
            }

        if preview_data:
            return {
                **game_data,
                'teams': [away_team, home_team],
                'stadium': game_info.get("stadium", game_data.get('stadium', '')),
                'starting_lineups': starting_lineups,
                'lineup_status': 'not_confirmed',
                'lineup_source': 'naver_api_preview',
                'crawl_time': datetime.now().isoformat(),
                'error': 'API preview did not include full batting orders'
            }

        return None

    def get_lineup_info_via_record_api(self, game_data):
        game_code = game_data.get('game_code')
        if not game_code:
            return None

        try:
            record_result = self._api_get_json(f"/schedule/games/{game_code}/record")
        except Exception as e:
            logger.warning(f"레코드 API 조회 실패 ({game_code}): {e}")
            return None

        record_data = record_result.get("recordData") or {}
        game_info = record_data.get("gameInfo") or {}
        batters_boxscore = record_data.get("battersBoxscore") or {}
        pitchers_boxscore = record_data.get("pitchersBoxscore") or {}

        away_team = self._normalize_team_entry(
            game_info.get("aCode"),
            game_info.get("aName"),
            game_info.get("aFullName"),
            False,
        )
        home_team = self._normalize_team_entry(
            game_info.get("hCode"),
            game_info.get("hName"),
            game_info.get("hFullName"),
            True,
        )

        teams = game_data.get('teams', [])
        if len(teams) >= 2:
            away_team = {**away_team, **teams[0]}
            home_team = {**home_team, **teams[1]}

        starting_lineups = {
            'team_1': self._build_team_lineup_from_record(
                away_team,
                batters_boxscore.get("away") or [],
                pitchers_boxscore.get("away") or [],
                fallback_pitcher_id=game_info.get("aPCode") or "",
                fallback_pitcher_name=game_data.get('away_starter_name', ''),
            ),
            'team_2': self._build_team_lineup_from_record(
                home_team,
                batters_boxscore.get("home") or [],
                pitchers_boxscore.get("home") or [],
                fallback_pitcher_id=game_info.get("hPCode") or "",
                fallback_pitcher_name=game_data.get('home_starter_name', ''),
            ),
        }

        if not self._is_lineup_parse_successful(starting_lineups):
            return None

        return {
            **game_data,
            'teams': [away_team, home_team],
            'stadium': game_info.get("stadium", game_data.get('stadium', '')),
            'starting_lineups': starting_lineups,
            'lineup_status': 'confirmed',
            'lineup_source': 'naver_api_record',
            'crawl_time': datetime.now().isoformat()
        }
        
    def get_daily_games(self, date):
        try:
            api_games = self.get_daily_games_via_api(date)
            if api_games:
                logger.info(f"일정 API 로드 성공: {len(api_games)}개 경기 발견")
                return api_games
            logger.warning(f"일정 API 결과가 비어 있어 DOM fallback 사용: {date}")
        except Exception as e:
            logger.warning(f"일정 API 조회 실패, DOM fallback 사용 ({date}): {e}")

        if not self.ensure_driver():
            print("❌ 드라이버가 초기화되지 않아 DOM fallback을 사용할 수 없습니다.")
            return []
        max_retries = 3
        retry_delay = 5
        
        for attempt in range(max_retries):
            try:
                url = f"{self.base_url}/kbaseball/schedule/index?date={date}"
                logger.info(f"페이지 로딩 시도 {attempt + 1}/{max_retries}: {url}")
                
                self.driver.get(url)
                
                # JavaScript 실행 완료 대기
                self.wait.until(lambda driver: driver.execute_script('return document.readyState') == 'complete')
                time.sleep(5)  # 추가 대기 시간
                
                # 경기 목록이 로드될 때까지 대기
                game_items = []
                try:
                    # "KBO리그" 섹션을 우선 찾고, 실패하면 페이지 전체에서 경기 박스를 탐색
                    kbo_section = self._wait_for_any(
                        [
                            (
                                By.XPATH,
                                "//a[contains(@class,'ScheduleAllType_group_title')][.//em[contains(text(),'KBO')]]/following-sibling::ul",
                            ),
                            (
                                By.XPATH,
                                "//em[contains(text(),'KBO')]/ancestor::*[self::a or self::strong or self::div][1]/following-sibling::ul[1]",
                            ),
                        ]
                    )
                    game_items = self._find_all_first(
                        kbo_section,
                        [
                            (By.CSS_SELECTOR, "li[class*='MatchBox_match_item']"),
                            (By.CSS_SELECTOR, "li[class*='match_item']"),
                            (By.XPATH, ".//li[.//a[contains(@href,'/game/')]]"),
                        ],
                    )
                    game_items = [
                        item for item in game_items
                        if 'empty' not in (item.get_attribute('class') or '')
                    ]
                except TimeoutException:
                    game_items = self._find_all_first(
                        self.driver,
                        [
                            (
                                By.XPATH,
                                "//li[.//a[contains(@href,'/game/')] and not(contains(@class,'empty'))]",
                            ),
                            (By.CSS_SELECTOR, "li[class*='MatchBox_match_item']"),
                        ],
                    )

                if not game_items:
                    logger.warning(f"경기 목록을 찾을 수 없음 (시도 {attempt + 1}/{max_retries})")
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay)
                        continue
                    return []

                logger.info(f"경기 목록 로드 성공: {len(game_items)}개 경기 발견")

                games_data = []
                for game_item in game_items:
                    try:
                        # 경기 링크에서 경기 코드 추출
                        game_link = self._find_first(
                            game_item,
                            [
                                (By.CSS_SELECTOR, "a[class*='MatchBox_link_match']"),
                                (By.CSS_SELECTOR, "a[href*='/game/']"),
                            ],
                        )
                        href = game_link.get_attribute('href')
                        game_code = self._extract_game_code(href)

                        if game_code and self._is_probable_kbo_game_code(game_code):
                            
                            # 경기 시간
                            game_time = self._extract_text_by_selectors(
                                game_item,
                                [
                                    (By.CSS_SELECTOR, "div[class*='MatchBox_time']"),
                                    (By.CSS_SELECTOR, "[class*='time']"),
                                    (By.XPATH, ".//*[contains(text(),'경기 시간')]"),
                                ],
                                default="",
                            )
                            
                            # 경기 상태
                            game_status = self._extract_text_by_selectors(
                                game_item,
                                [
                                    (By.CSS_SELECTOR, "em[class*='MatchBox_status']"),
                                    (By.CSS_SELECTOR, "[class*='status']"),
                                ],
                                default="",
                            )
                            
                            # 팀 정보 추출
                            team_items = self._find_all_first(
                                game_item,
                                [
                                    (
                                        By.CSS_SELECTOR,
                                        "div[class*='MatchBoxHeadToHeadArea_team_item']",
                                    ),
                                    (By.CSS_SELECTOR, "div[class*='team_item']"),
                                    (
                                        By.XPATH,
                                        ".//*[self::div or self::li][.//*[contains(@class,'team')]]",
                                    ),
                                ],
                            )
                            teams = []
                            
                            for team_item in team_items:
                                team_name = self._extract_text_by_selectors(
                                    team_item,
                                    [
                                        (
                                            By.CSS_SELECTOR,
                                            "strong[class*='MatchBoxHeadToHeadArea_team']",
                                        ),
                                        (By.CSS_SELECTOR, "strong[class*='team']"),
                                        (By.XPATH, ".//strong"),
                                    ],
                                )

                                try:
                                    score = self._find_first(
                                        team_item,
                                        [
                                            (
                                                By.CSS_SELECTOR,
                                                "strong[class*='MatchBoxHeadToHeadArea_score']",
                                            ),
                                            (By.CSS_SELECTOR, "strong[class*='score']"),
                                        ],
                                    ).text.strip()
                                except NoSuchElementException:
                                    score = "-"  # 점수가 없는 경우

                                is_home = bool(
                                    self._find_all_first(
                                        team_item,
                                        [
                                            (
                                                By.CSS_SELECTOR,
                                                "div[class*='MatchBoxHeadToHeadArea_home_mark']",
                                            ),
                                            (By.CSS_SELECTOR, "[class*='home_mark']"),
                                            (
                                                By.XPATH,
                                                ".//*[contains(text(),'홈') and string-length(normalize-space(text())) <= 3]",
                                            ),
                                        ],
                                    )
                                )

                                if team_name:
                                    teams.append({
                                        'name': team_name,
                                        'score': score,
                                        'is_home': is_home
                                    })
                                
                            # 라인업 URL 생성
                            lineup_url = f"{self.base_url}/game/{game_code}/lineup"
                            
                            # 경기 데이터 저장
                            game_data = {
                                'date': date,
                                'game_code': game_code,
                                'game_time': game_time,
                                'game_status': game_status,
                                'teams': teams,
                                'lineup_url': lineup_url
                            }
                            
                            games_data.append(game_data)
                            
                    except Exception as e:
                        logger.error(f"경기 정보 추출 중 오류 발생: {str(e)}")
                        continue
                        
                return games_data
                
            except Exception as e:
                logger.error(f"페이지 로딩 중 오류 발생: {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
                return []
                
        return []

    def get_lineup_info_via_dom(self, game_data):
        """경기별 라인업 정보 수집 (DOM fallback)"""
        try:
            lineup_url = game_data['lineup_url']
            
            self.driver.get(lineup_url)
            time.sleep(5)  # 페이지 로딩 대기
            
            # 라인업 확정 여부 확인
            try:
                empty_text = self._wait_for_any(
                    [
                        (By.CLASS_NAME, "Empty_empty_text__1329Q"),
                        (
                            By.XPATH,
                            "//*[contains(text(),'출전 선수 명단이 확정되면')]",
                        ),
                    ],
                    timeout=5,
                )
                if "출전 선수 명단이 확정되면" in empty_text.text:
                    return {
                        **game_data,
                        'starting_lineups': {},
                        'lineup_status': 'not_confirmed',
                        'crawl_time': datetime.now().isoformat()
                    }
            except TimeoutException:
                pass
            
            # 선발 라인업 정보 추출
            starting_lineups = {}
            
            try:
                lineup_container = self._wait_for_any(
                    [
                        (By.CLASS_NAME, "Lineup_comp_lineup__361i1"),
                        (By.CSS_SELECTOR, "[class*='Lineup_comp_lineup']"),
                        (
                            By.XPATH,
                            "//*[contains(.,'선발') and .//*[contains(@href,'playerId=')]]",
                        ),
                    ]
                )
                lineup_areas = self._find_all_first(
                    lineup_container,
                    [
                        (By.CLASS_NAME, "Lineup_lineup_area__1yURq"),
                        (By.CSS_SELECTOR, "[class*='Lineup_lineup_area']"),
                        (
                            By.XPATH,
                            ".//*[self::section or self::div][.//*[contains(.,'선발') and self::strong or self::h3 or self::span]]",
                        ),
                    ],
                )
                
                for i, area in enumerate(lineup_areas):
                    team_starting_lineup = self.extract_team_starting_lineup(area)
                    if team_starting_lineup:
                        starting_lineups[f"team_{i+1}"] = team_starting_lineup
                
            except Exception as e:
                return {
                    **game_data,
                    'starting_lineups': {},
                    'lineup_status': 'error',
                    'error': str(e),
                    'crawl_time': datetime.now().isoformat()
                }
            
            if not self._is_lineup_parse_successful(starting_lineups):
                return {
                    **game_data,
                    'starting_lineups': starting_lineups,
                    'lineup_status': 'error',
                    'lineup_source': 'naver_dom',
                    'error': 'Parsed lineup data was incomplete',
                    'crawl_time': datetime.now().isoformat()
                }

            return {
                **game_data,
                'starting_lineups': starting_lineups,
                'lineup_status': 'confirmed',
                'lineup_source': 'naver_dom',
                'crawl_time': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                **game_data,
                'starting_lineups': {},
                'lineup_status': 'error',
                'lineup_source': 'naver_dom',
                'error': str(e),
                'crawl_time': datetime.now().isoformat()
            }

    def get_lineup_info(self, game_data):
        """경기별 라인업 정보 수집"""
        enriched_game_data = self.enrich_game_data_via_api(game_data)
        api_lineup = self.get_lineup_info_via_api(enriched_game_data)
        if api_lineup and api_lineup.get('lineup_status') == 'confirmed':
            return api_lineup

        record_lineup = self.get_lineup_info_via_record_api(enriched_game_data)
        if record_lineup and record_lineup.get('lineup_status') == 'confirmed':
            return record_lineup

        if not self.ensure_driver():
            if api_lineup:
                return api_lineup
            if record_lineup:
                return record_lineup
            return {
                **enriched_game_data,
                'starting_lineups': {},
                'lineup_status': 'error',
                'lineup_source': 'naver_api',
                'error': 'Driver unavailable and API lineup data was insufficient',
                'crawl_time': datetime.now().isoformat()
            }

        dom_lineup = self.get_lineup_info_via_dom(enriched_game_data)
        if dom_lineup.get('lineup_status') == 'confirmed':
            return dom_lineup

        if record_lineup:
            return {
                **record_lineup,
                'api_preview_starting_lineups': (
                    api_lineup.get('starting_lineups', {}) if api_lineup else {}
                ),
                'api_preview_status': (
                    api_lineup.get('lineup_status') if api_lineup else ''
                ),
                'api_preview_error': (
                    api_lineup.get('error', '') if api_lineup else ''
                ),
            }

        if api_lineup:
            if api_lineup.get('lineup_status') == 'not_confirmed':
                return api_lineup

            merged_lineup = {
                **dom_lineup,
                'teams': api_lineup.get('teams', dom_lineup.get('teams', [])),
                'stadium': api_lineup.get('stadium', dom_lineup.get('stadium', '')),
                'api_preview_starting_lineups': api_lineup.get('starting_lineups', {}),
                'api_preview_status': api_lineup.get('lineup_status'),
                'api_preview_error': api_lineup.get('error', ''),
            }
            return merged_lineup

        return dom_lineup

    def extract_team_starting_lineup(self, lineup_area):
        """팀별 선발 라인업만 추출"""
        try:
            # 팀명 추출
            title_elem = self._find_first(
                lineup_area,
                [
                    (By.CLASS_NAME, "Lineup_lineup_title__3pWMB"),
                    (By.CSS_SELECTOR, "[class*='Lineup_lineup_title']"),
                    (By.XPATH, ".//*[self::strong or self::h3 or self::div][contains(.,'선발')]"),
                ],
            )
            
            # 팀 로고에서 팀 코드 추출
            team_code = ""
            try:
                team_logo = title_elem.find_element(By.TAG_NAME, "img")
                team_code = team_logo.get_attribute("src").split("/")[-1].replace(".png", "")
            except NoSuchElementException:
                pass
            team_name = title_elem.text.replace("선발", "").strip()
            
            # 선수 리스트 추출
            lineup_list = self._find_first(
                lineup_area,
                [
                    (By.CLASS_NAME, "Lineup_lineup_list__1g5nJ"),
                    (By.CSS_SELECTOR, "[class*='Lineup_lineup_list']"),
                    (By.XPATH, ".//*[.//a[contains(@href,'playerId=')]]"),
                ],
            )
            player_items = self._find_all_first(
                lineup_list,
                [
                    (By.CLASS_NAME, "Lineup_lineup_item__2AXR8"),
                    (By.CSS_SELECTOR, "[class*='Lineup_lineup_item']"),
                    (By.XPATH, ".//*[self::li or self::div][.//a[contains(@href,'playerId=')]]"),
                ],
            )
            
            starting_pitcher = None
            starting_batters = []
            
            for item in player_items:
                try:
                    player_link = self._find_first(
                        item,
                        [
                            (By.CLASS_NAME, "Lineup_link_player__3ieWG"),
                            (By.CSS_SELECTOR, "a[class*='Lineup_link_player']"),
                            (By.CSS_SELECTOR, "a[href*='playerId=']"),
                        ],
                    )
                    
                    # 선수 ID 추출
                    href = player_link.get_attribute("href")
                    player_id = ""
                    if "playerId=" in href:
                        player_id = href.split("playerId=")[1].split("&")[0]
                    
                    # 타순 또는 역할 정보
                    order_text = self._extract_text_by_selectors(
                        item,
                        [
                            (By.CLASS_NAME, "Lineup_order__F3OtA"),
                            (By.CSS_SELECTOR, "[class*='Lineup_order']"),
                            (
                                By.XPATH,
                                ".//*[contains(text(),'선발') or normalize-space(text())='1' or normalize-space(text())='2' or normalize-space(text())='3' or normalize-space(text())='4' or normalize-space(text())='5' or normalize-space(text())='6' or normalize-space(text())='7' or normalize-space(text())='8' or normalize-space(text())='9']",
                            ),
                        ],
                    )
                    
                    # 선수명
                    player_name = self._extract_text_by_selectors(
                        item,
                        [
                            (By.CLASS_NAME, "Lineup_name__Q5oDC"),
                            (By.CSS_SELECTOR, "[class*='Lineup_name']"),
                            (By.XPATH, ".//a[contains(@href,'playerId=')]"),
                        ],
                    )
                    
                    # 포지션 정보
                    position_text = self._extract_text_by_selectors(
                        item,
                        [
                            (By.CLASS_NAME, "Lineup_position__2fA4L"),
                            (By.CSS_SELECTOR, "[class*='Lineup_position']"),
                        ],
                    )
                    
                    # 선발투수인지 확인
                    if "선발" in order_text:
                        throwing_hand = ""
                        if "우투" in position_text:
                            throwing_hand = "우투"
                        elif "좌투" in position_text:
                            throwing_hand = "좌투"
                        
                        starting_pitcher = {
                            'player_id': player_id,
                            'name': player_name,
                            'throwing_hand': throwing_hand,
                            'position': '투수',
                            'role': '선발투수'
                        }
                    
                    # 타순이 숫자인지 확인 (1-9번 타자만)
                    elif order_text.isdigit() and 1 <= int(order_text) <= 9:
                        position = ""
                        batting_hand = ""
                        
                        if "," in position_text:
                            parts = position_text.split(",")
                            position = parts[0].strip()
                            batting_hand = parts[1].strip()
                        else:
                            position = position_text
                        
                        batter_info = {
                            'player_id': player_id,
                            'name': player_name,
                            'batting_order': int(order_text),
                            'position': position,
                            'batting_hand': batting_hand,
                            'role': '선발타자'
                        }
                        starting_batters.append(batter_info)
                
                except Exception as e:
                    continue
            
            # 타순으로 정렬
            starting_batters.sort(key=lambda x: x['batting_order'])
            
            return {
                'team_name': team_name,
                'team_code': team_code,
                'starting_pitcher': starting_pitcher,
                'starting_batters': starting_batters
            }
            
        except Exception as e:
            return None
    
    def crawl_all_season_lineups(self, start_date='2025-03-25', end_date=None):
        """시즌 전체 기간의 모든 선발 라인업 크롤링"""
        if end_date is None:
            end_date = datetime.now().strftime('%Y-%m-%d')
        
        print(f"🚀 === KBO 시즌 전체 선발 라인업 크롤링 시작 ===")
        print(f"📅 기간: {start_date} ~ {end_date}")
        
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        
        total_days = (end - start).days + 1
        total_games = 0
        total_confirmed = 0
        processed_days = 0
        
        current_date = start
        
        while current_date <= end:
            date_str = current_date.strftime('%Y-%m-%d')
            processed_days += 1
            
            print(f"\n📆 [{processed_days}/{total_days}] {date_str} 크롤링 중...")
            
            try:
                # 해당 날짜의 경기 목록 가져오기
                games_data = self.get_daily_games(date_str)
                
                if not games_data:
                    print(f"    ⚪ {date_str}: 경기 없음")
                    current_date += timedelta(days=1)
                    time.sleep(1)  # 경기 없는 날은 짧은 딜레이
                    continue
                
                print(f"    ⚾ {date_str}: {len(games_data)}개 경기 발견")
                
                # 각 경기의 선발 라인업 추출
                day_lineups = []
                for i, game_data in enumerate(games_data, 1):
                    team_names = f"{game_data['teams'][0]['name']} vs {game_data['teams'][1]['name']}"
                    print(f"      📋 [{i}/{len(games_data)}] {team_names} ({game_data['game_code']})")
                    
                    lineup_data = self.get_lineup_info(game_data)
                    day_lineups.append(lineup_data)
                    
                    if lineup_data.get('lineup_status') == 'confirmed':
                        total_confirmed += 1
                        print(f"        ✅ 라인업 확정")
                    else:
                        print(f"        ⏳ 라인업 미확정")
                    
                    total_games += 1
                    
                    # 경기 간 딜레이
                    time.sleep(2)
                
                # 일별 데이터를 전체 데이터에 추가
                self.all_data.extend(day_lineups)
                
                # 진행상황 출력
                print(f"    📊 누적: 총 {total_games}경기, 확정 {total_confirmed}경기")
                
                # 날짜 간 딜레이
                time.sleep(3)
                
            except Exception as e:
                print(f"    ❌ {date_str} 크롤링 실패: {e}")
            
            current_date += timedelta(days=1)
        
        print(f"\n🎉 === 시즌 전체 크롤링 완료 ===")
        print(f"📊 총 처리일수: {processed_days}일")
        print(f"⚾ 총 경기수: {total_games}경기")
        print(f"✅ 확정 라인업: {total_confirmed}경기")
        print(f"📂 수집된 데이터: {len(self.all_data)}개")
        
        return self.all_data
    
    def save_all_data_to_files(self, data=None):
        """전체 수집 데이터를 파일로 저장"""
        if data is None:
            data = self.all_data
        
        if not data:
            print("❌ 저장할 데이터가 없습니다.")
            return
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # JSON 저장
        json_filename = os.path.join(self.save_dir, f'kbo_all_starting_lineups_{timestamp}.json')
        save_data = {
            'crawl_info': {
                'crawl_time': datetime.now().isoformat(),
                'total_games': len(data),
                'type': 'all_season_starting_lineups'
            },
            'games': data
        }
        
        with open(json_filename, 'w', encoding='utf-8') as f:
            json.dump(save_data, f, ensure_ascii=False, indent=2)
        print(f"💾 전체 데이터 JSON 저장: {json_filename}")
        
        # CSV 저장
        csv_filename = self.save_all_data_to_csv(data, timestamp)
        
        return json_filename, csv_filename
    
    def save_all_data_to_csv(self, data, timestamp):
        """전체 데이터를 CSV로 저장"""
        all_players = []
        
        for game_data in data:
            date = game_data.get('date', '')
            game_code = game_data.get('game_code', '')
            game_time = game_data.get('game_time', '')
            game_status = game_data.get('game_status', '')
            lineup_status = game_data.get('lineup_status', '')
            
            starting_lineups = game_data.get('starting_lineups', {})
            
            for team_key, team_data in starting_lineups.items():
                team_name = team_data.get('team_name', '')
                team_code = team_data.get('team_code', '')
                
                # 선발투수
                starting_pitcher = team_data.get('starting_pitcher')
                if starting_pitcher:
                    pitcher_row = {
                        'date': date,
                        'game_code': game_code,
                        'game_time': game_time,
                        'game_status': game_status,
                        'lineup_status': lineup_status,
                        'team': team_name,
                        'team_code': team_code,
                        'player_type': 'pitcher',
                        'player_id': starting_pitcher.get('player_id', ''),
                        'name': starting_pitcher.get('name', ''),
                        'batting_order': 0,
                        'position': starting_pitcher.get('position', ''),
                        'batting_hand': '',
                        'throwing_hand': starting_pitcher.get('throwing_hand', ''),
                        'role': starting_pitcher.get('role', '')
                    }
                    all_players.append(pitcher_row)
                
                # 선발타자
                for batter in team_data.get('starting_batters', []):
                    batter_row = {
                        'date': date,
                        'game_code': game_code,
                        'game_time': game_time,
                        'game_status': game_status,
                        'lineup_status': lineup_status,
                        'team': team_name,
                        'team_code': team_code,
                        'player_type': 'batter',
                        'player_id': batter.get('player_id', ''),
                        'name': batter.get('name', ''),
                        'batting_order': batter.get('batting_order', ''),
                        'position': batter.get('position', ''),
                        'batting_hand': batter.get('batting_hand', ''),
                        'throwing_hand': '',
                        'role': batter.get('role', '')
                    }
                    all_players.append(batter_row)
        
        if all_players:
            players_df = pd.DataFrame(all_players)
            csv_filename = os.path.join(self.save_dir, f'kbo_all_starting_lineups_{timestamp}.csv')
            players_df.to_csv(csv_filename, index=False, encoding='utf-8-sig')
            print(f"📊 전체 데이터 CSV 저장: {csv_filename} ({len(all_players)}개 행)")
            return csv_filename
        
        return None
    
    def get_final_summary(self, data=None):
        """최종 수집 결과 요약"""
        if data is None:
            data = self.all_data
        
        print(f"\n📈 === 최종 수집 결과 요약 ===")
        
        if not data:
            print("❌ 수집된 데이터가 없습니다.")
            return
        
        # 기본 통계
        total_games = len(data)
        confirmed_games = len([g for g in data if g.get('lineup_status') == 'confirmed'])
        not_confirmed_games = len([g for g in data if g.get('lineup_status') == 'not_confirmed'])
        error_games = len([g for g in data if g.get('lineup_status') == 'error'])
        
        # 날짜별 통계
        dates = list(set([g.get('date', '') for g in data]))
        dates.sort()
        
        # 팀별 통계
        teams = {}
        for game in data:
            for team_key, team_data in game.get('starting_lineups', {}).items():
                team_name = team_data.get('team_name', '')
                if team_name:
                    teams[team_name] = teams.get(team_name, 0) + 1
        
        print(f"📅 수집 기간: {dates[0] if dates else 'N/A'} ~ {dates[-1] if dates else 'N/A'}")
        print(f"📆 수집 일수: {len(dates)}일")
        print(f"⚾ 총 경기: {total_games}경기")
        print(f"✅ 라인업 확정: {confirmed_games}경기 ({confirmed_games/total_games*100:.1f}%)")
        print(f"⏳ 라인업 미확정: {not_confirmed_games}경기 ({not_confirmed_games/total_games*100:.1f}%)")
        print(f"❌ 오류: {error_games}경기 ({error_games/total_games*100:.1f}%)")
        
        print(f"\n📊 팀별 경기 수:")
        for team, count in sorted(teams.items()):
            print(f"   {team}: {count}경기")
    
    def close(self):
        """드라이버 종료"""
        if self.driver:
            try:
                self.driver.quit()
            except Exception as e:
                logger.error(f"드라이버 종료 중 오류 발생: {str(e)}")
            finally:
                self.driver = None
                self.wait = None
        self.session.close()

    def save_game_to_json(self, game_data):
        """경기별로 JSON 파일로 저장"""
        date = game_data.get('date', '')
        game_code = game_data.get('game_code', '')
        teams = game_data.get('teams', [])
        if len(teams) >= 2:
            team1 = teams[0]['name']
            team2 = teams[1]['name']
        else:
            team1 = 'team1'
            team2 = 'team2'
        filename = f"{date}_{game_code}_{team1}-{team2}.json"
        filename = filename.replace(' ', '').replace(':', '').replace('/', '-')
        save_path = os.path.join(self.save_dir, filename)
        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(game_data, f, ensure_ascii=False, indent=2)
        print(f"💾 경기 저장: {save_path}")
        return save_path

    def has_saved_game_for_date(self, date):
        prefix = f"{date}_"
        return any(
            filename.startswith(prefix) and filename.endswith(".json")
            for filename in os.listdir(self.save_dir)
        )

    def crawl_and_save_by_dates(self, date_list, skip_existing_dates=False):
        """여러 날짜의 경기들을 크롤링하고 경기별로 저장"""
        summary = {
            'dates': [],
            'total_games': 0,
            'confirmed': 0,
            'not_confirmed': 0,
            'error': 0,
            'saved': 0,
            'skipped_dates': 0,
            'lineup_sources': {},
        }

        for date in date_list:
            if skip_existing_dates and self.has_saved_game_for_date(date):
                print(f"\n⏭️ {date} 기존 데이터가 있어 건너뜁니다.")
                summary['dates'].append({
                    'date': date,
                    'games': 0,
                    'confirmed': 0,
                    'not_confirmed': 0,
                    'error': 0,
                    'saved': 0,
                    'skipped': True,
                })
                summary['skipped_dates'] += 1
                continue

            print(f"\n🗓️ {date} 크롤링 시작...")
            games = self.get_daily_games(date)
            date_summary = {
                'date': date,
                'games': len(games),
                'confirmed': 0,
                'not_confirmed': 0,
                'error': 0,
                'saved': 0,
                'skipped': False,
            }

            if not games:
                print(f"❌ {date} 경기 없음")
                summary['dates'].append(date_summary)
                continue

            summary['total_games'] += len(games)

            for game in games:
                lineup = self.get_lineup_info(game)
                status = lineup.get('lineup_status')
                lineup_source = lineup.get('lineup_source', 'unknown')
                if status == 'confirmed':
                    summary['confirmed'] += 1
                    date_summary['confirmed'] += 1
                elif status == 'not_confirmed':
                    summary['not_confirmed'] += 1
                    date_summary['not_confirmed'] += 1
                else:
                    summary['error'] += 1
                    date_summary['error'] += 1

                summary['lineup_sources'][lineup_source] = (
                    summary['lineup_sources'].get(lineup_source, 0) + 1
                )
                self.save_game_to_json(lineup)
                summary['saved'] += 1
                date_summary['saved'] += 1
                time.sleep(2)

            summary['dates'].append(date_summary)
            time.sleep(3)

        return summary

    def validate_crawl_summary(self, summary):
        """이번 실행이 전부 파싱 오류로 끝나지 않았는지 검증"""
        total_games = summary.get('total_games', 0)
        successful_games = (
            summary.get('confirmed', 0) + summary.get('not_confirmed', 0)
        )

        if total_games == 0:
            print("ℹ️ 오늘은 수집할 경기 데이터가 없어 실패로 처리하지 않습니다.")
            return True

        if successful_games == 0:
            print("❌ 경기 데이터는 있었지만 라인업 파싱이 모두 실패했습니다.")
            return False

        print(
            "✅ 크롤링 검증 통과: "
            f"총 {total_games}경기 / 확정 {summary.get('confirmed', 0)} / "
            f"미확정 {summary.get('not_confirmed', 0)} / 오류 {summary.get('error', 0)}"
        )
        if summary.get('skipped_dates'):
            print(f"ℹ️ 기존 데이터로 건너뛴 날짜: {summary['skipped_dates']}일")
        source_summary = summary.get('lineup_sources', {})
        if source_summary:
            print(f"ℹ️ 라인업 수집 경로: {source_summary}")
        return True

# 실행 코드
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="KBO 라인업 크롤러")
    parser.add_argument('--mode', choices=['full', 'incremental', 'range'], default='full', help='full: 전체, incremental: 최근 N일, range: 날짜 범위')
    parser.add_argument('--days', type=int, default=3, help='incremental 모드에서 최근 N일')
    parser.add_argument('--start-date', type=str, help='range 모드 시작일 (YYYY-MM-DD)')
    parser.add_argument('--end-date', type=str, help='range 모드 종료일 (YYYY-MM-DD)')
    parser.add_argument('--skip-existing-dates', action='store_true', help='이미 저장된 날짜는 건너뜀')
    parser.add_argument('--save_dir', type=str, default='public/data/kbo_crawler_data', help='저장 디렉토리')
    args = parser.parse_args()

    save_dir = args.save_dir
    if not os.path.exists(save_dir):
        print(f"📁 저장 디렉토리 생성 중: {save_dir}")
        os.makedirs(save_dir, exist_ok=True)
    print(f"📁 설정된 저장 경로: {save_dir}")
    print(f"📁 절대 경로: {os.path.abspath(save_dir)}")

    crawler = NaverKBOAllLineupCrawler(save_dir=save_dir)
    try:
        if args.mode == 'full':
            # 전체 시즌 날짜 리스트 생성
            start_date = '2025-03-25'
            end_date = datetime.now().strftime('%Y-%m-%d')
            start = datetime.strptime(start_date, '%Y-%m-%d')
            end = datetime.strptime(end_date, '%Y-%m-%d')
            date_list = [(start + timedelta(days=i)).strftime('%Y-%m-%d') for i in range((end-start).days+1)]
        elif args.mode == 'range':
            if not args.start_date or not args.end_date:
                raise ValueError("range 모드는 --start-date와 --end-date가 필요합니다.")
            start = datetime.strptime(args.start_date, '%Y-%m-%d')
            end = datetime.strptime(args.end_date, '%Y-%m-%d')
            if start > end:
                raise ValueError("start-date는 end-date보다 이후일 수 없습니다.")
            date_list = [(start + timedelta(days=i)).strftime('%Y-%m-%d') for i in range((end-start).days+1)]
        else:
            # 최근 N일 날짜 리스트 생성
            end = datetime.now()
            date_list = [(end - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(args.days)]
            date_list.reverse()
        print(f"\n🚀 크롤링 날짜: {date_list}")
        summary = crawler.crawl_and_save_by_dates(
            date_list,
            skip_existing_dates=args.skip_existing_dates,
        )
        if not crawler.validate_crawl_summary(summary):
            raise RuntimeError("라인업 크롤링 검증 실패")
        print("\n🎉 모든 경기별 파일 저장 완료!")

        # Save a rebuilt index of all lineup JSON files
        index_script = os.path.join(os.path.dirname(__file__), '..', 'scripts', 'generateLineupIndex.js')
        try:
            subprocess.run(['node', index_script], check=True)
            print("🔃 라인업 인덱스 갱신 완료")
        except FileNotFoundError:
            print("❌ Node.js를 찾을 수 없어 인덱스 갱신을 건너뜁니다.")
        except subprocess.CalledProcessError as e:
            print(f"❌ 라인업 인덱스 갱신 실패: {e}")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
    finally:
        crawler.close()
