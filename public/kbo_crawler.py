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
        self.save_dir = save_dir
        self.driver = None
        self.wait = None
        
        # 저장 디렉토리 생성
        os.makedirs(save_dir, exist_ok=True)
        print(f"📁 설정된 저장 경로: {save_dir}")
        print(f"📁 절대 경로: {os.path.abspath(save_dir)}")
        
        # 드라이버 초기화
        try:
            self.setup_driver()
        except Exception as e:
            print(f"❌ 드라이버 초기화 실패: {e}")
            self.driver = None
            self.wait = None

    def setup_driver(self, headless=True):
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
        
    def get_daily_games(self, date):
        if self.driver is None:
            print("❌ 드라이버가 초기화되지 않아 크롤링을 중단합니다.")
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
                    # "KBO리그" 섹션만 선택
                    kbo_section = self.wait.until(
                        EC.presence_of_element_located(
                            (
                                By.XPATH,
                                "//a[contains(@class,'ScheduleAllType_group_title')][.//em[contains(text(),'KBO')]]/following-sibling::ul",
                            )
                        )
                    )
                    game_items = kbo_section.find_elements(
                        By.CSS_SELECTOR,
                        "li[class^='MatchBox_match_item']:not([class*='_empty'])",
                    )
                except TimeoutException as e:
                    last_exception = e
                except Exception as e:
                    last_exception = e

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
                        game_link = game_item.find_element(By.CSS_SELECTOR, "a[class^='MatchBox_link_match']")
                        href = game_link.get_attribute('href')
                        
                        if '/game/' in href:
                            game_code = href.split('/game/')[1]
                            
                            # 경기 시간
                            time_elem = game_item.find_element(By.CSS_SELECTOR, "div[class^='MatchBox_time']")
                            game_time = time_elem.text.strip()
                            
                            # 경기 상태
                            status_elem = game_item.find_element(By.CSS_SELECTOR, "em[class^='MatchBox_status']")
                            game_status = status_elem.text.strip()
                            
                            # 팀 정보 추출
                            team_items = game_item.find_elements(By.CSS_SELECTOR, "div[class^='MatchBoxHeadToHeadArea_team_item']")
                            teams = []
                            
                            for team_item in team_items:
                                team_name = team_item.find_element(
                                    By.CSS_SELECTOR,
                                    "strong[class^='MatchBoxHeadToHeadArea_team']",
                                ).text.strip()

                                try:
                                    score = team_item.find_element(
                                        By.CSS_SELECTOR,
                                        "strong[class^='MatchBoxHeadToHeadArea_score']",
                                    ).text.strip()
                                except NoSuchElementException:
                                    score = "-"  # 점수가 없는 경우

                                is_home = bool(
                                    team_item.find_elements(
                                        By.CSS_SELECTOR,
                                        "div[class^='MatchBoxHeadToHeadArea_home_mark']",
                                    )
                                )
                                
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

    def get_lineup_info(self, game_data):
        """경기별 라인업 정보 수집"""
        try:
            lineup_url = game_data['lineup_url']
            
            self.driver.get(lineup_url)
            time.sleep(5)  # 페이지 로딩 대기
            
            # 라인업 확정 여부 확인
            try:
                empty_text = self.wait.until(
                    EC.presence_of_element_located((By.CLASS_NAME, "Empty_empty_text__1329Q"))
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
                lineup_container = self.wait.until(
                    EC.presence_of_element_located((By.CLASS_NAME, "Lineup_comp_lineup__361i1"))
                )
                lineup_areas = lineup_container.find_elements(By.CLASS_NAME, "Lineup_lineup_area__1yURq")
                
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
            
            return {
                **game_data,
                'starting_lineups': starting_lineups,
                'lineup_status': 'confirmed',
                'crawl_time': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                **game_data,
                'starting_lineups': {},
                'lineup_status': 'error',
                'error': str(e),
                'crawl_time': datetime.now().isoformat()
            }

    def extract_team_starting_lineup(self, lineup_area):
        """팀별 선발 라인업만 추출"""
        try:
            # 팀명 추출
            title_elem = lineup_area.find_element(By.CLASS_NAME, "Lineup_lineup_title__3pWMB")
            
            # 팀 로고에서 팀 코드 추출
            team_logo = title_elem.find_element(By.TAG_NAME, "img")
            team_code = team_logo.get_attribute("src").split("/")[-1].replace(".png", "")
            team_name = title_elem.text.replace("선발", "").strip()
            
            # 선수 리스트 추출
            lineup_list = lineup_area.find_element(By.CLASS_NAME, "Lineup_lineup_list__1g5nJ")
            player_items = lineup_list.find_elements(By.CLASS_NAME, "Lineup_lineup_item__2AXR8")
            
            starting_pitcher = None
            starting_batters = []
            
            for item in player_items:
                try:
                    player_link = item.find_element(By.CLASS_NAME, "Lineup_link_player__3ieWG")
                    
                    # 선수 ID 추출
                    href = player_link.get_attribute("href")
                    player_id = ""
                    if "playerId=" in href:
                        player_id = href.split("playerId=")[1].split("&")[0]
                    
                    # 타순 또는 역할 정보
                    order_elem = item.find_element(By.CLASS_NAME, "Lineup_order__F3OtA")
                    order_text = order_elem.text.strip()
                    
                    # 선수명
                    name_elem = item.find_element(By.CLASS_NAME, "Lineup_name__Q5oDC")
                    player_name = name_elem.text.strip()
                    
                    # 포지션 정보
                    position_elem = item.find_element(By.CLASS_NAME, "Lineup_position__2fA4L")
                    position_text = position_elem.text.strip()
                    
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

    def crawl_and_save_by_dates(self, date_list):
        """여러 날짜의 경기들을 크롤링하고 경기별로 저장"""
        for date in date_list:
            print(f"\n🗓️ {date} 크롤링 시작...")
            games = self.get_daily_games(date)
            if not games:
                print(f"❌ {date} 경기 없음")
                continue
            for game in games:
                lineup = self.get_lineup_info(game)
                self.save_game_to_json(lineup)
                time.sleep(2)
            time.sleep(3)

# 실행 코드
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="KBO 라인업 크롤러")
    parser.add_argument('--mode', choices=['full', 'incremental'], default='full', help='full: 전체, incremental: 최근 N일')
    parser.add_argument('--days', type=int, default=3, help='incremental 모드에서 최근 N일')
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
        else:
            # 최근 N일 날짜 리스트 생성
            end = datetime.now()
            date_list = [(end - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(args.days)]
            date_list.reverse()
        print(f"\n🚀 크롤링 날짜: {date_list}")
        crawler.crawl_and_save_by_dates(date_list)
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
