import json
import time
import re
from datetime import datetime
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import Select, WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

TEAM_CODES = {
    "HH": "한화",
    "OB": "두산",
    "SS": "삼성",
    "LT": "롯데",
    "LG": "LG",
    "WO": "키움",
    "NC": "NC",
    "HT": "KIA",
    "SK": "SSG",
    "KT": "KT",
}


def _parse_date(text: str) -> str:
    """Convert 'YYYY-MM-DD' into ISO format used in data."""
    try:
        return datetime.strptime(text, "%Y-%m-%d").isoformat() + "Z"
    except ValueError:
        return text


def _scrape_team(driver: webdriver.Chrome, code: str) -> list:
    wait = WebDriverWait(driver, 10)
    try:
        # Wait for the team dropdown to be present before interacting
        wait.until(
            EC.presence_of_element_located(
                (By.ID, "cphContents_cphContents_cphContents_ddlTeam")
            )
        )
        select = Select(
            driver.find_element(By.ID, "cphContents_cphContents_cphContents_ddlTeam")
        )
        select.select_by_value(code)
        time.sleep(3)  # 팀 선택 후 충분히 대기
        # Wait for the table to load after selecting the team
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table.tEx")))
    except Exception as e:
        print(f"[ERROR] {TEAM_CODES.get(code, code)} 드롭다운/테이블 로딩 실패: {e}")
        return []
    players = []

    # Determine event target prefix for pagination buttons
    try:
        first_btn = driver.find_element(
            By.ID, "cphContents_cphContents_cphContents_ucPager_btnNo1"
        )
        href = first_btn.get_attribute("href")
        prefix_match = re.search(r"__doPostBack\('([^']*btnNo)1','", href)
        prefix = (
            prefix_match.group(1)
            if prefix_match
            else "ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$ucPager$btnNo"
        )
    except Exception as e:
        print(f"[ERROR] {TEAM_CODES.get(code, code)} 페이지네이션 버튼 파싱 실패: {e}")
        return []

    # Find the last page number using the "last" button if available
    last_page = 1
    last_elems = driver.find_elements(
        By.ID, "cphContents_cphContents_cphContents_ucPager_btnLast"
    )
    if last_elems:
        last_href = last_elems[0].get_attribute("href")
        m = re.search(r"btnNo(\d+)", last_href)
        if m:
            last_page = int(m.group(1))
    else:
        # 페이지 번호 버튼 중 가장 큰 번호를 찾음 (맨끝 버튼이 없을 때)
        page_btns = driver.find_elements(By.CSS_SELECTOR, "a[id^='cphContents_cphContents_cphContents_ucPager_btnNo']")
        page_nums = []
        for btn in page_btns:
            m = re.search(r"btnNo(\d+)", btn.get_attribute("id"))
            if m:
                page_nums.append(int(m.group(1)))
        if page_nums:
            last_page = max(page_nums)

    page_num = 1
    while page_num <= 5:
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table.tEx")))
            soup = BeautifulSoup(driver.page_source, "html.parser")
            table = soup.find("table", class_="tEx")
            if not table:
                print(f"[ERROR] {TEAM_CODES.get(code, code)}: 테이블 없음 (페이지 {page_num})")
                break
            # 디버깅용: 처음 2페이지까지만 HTML 저장
            if page_num <= 2:
                with open(f"debug_{code}_{page_num}.html", "w", encoding="utf-8") as f:
                    f.write(driver.page_source)
            # 실제 페이지 번호 추출 (페이지네이션에서 bold 처리된 번호)
            current_page = None
            for strong in soup.select(".pagenation strong"):  # 실제 클래스명은 사이트 구조에 맞게 조정 필요
                try:
                    current_page = int(strong.text.strip())
                except:
                    pass
            rows = table.find("tbody").find_all("tr")
            for row in rows:
                cols = [c.get_text(strip=True) for c in row.find_all("td")]
                if len(cols) < 7:
                    continue
                if len(cols) == 7:
                    number, name, team, position, birth, body, school = cols
                    throwbat = ""
                else:
                    number, name, team, position, throwbat, birth, body, school = cols[:8]
                player = {
                    "teamCode": code,
                    "teamName": TEAM_CODES.get(code, ""),
                    "number": number,
                    "playerName": name,
                    "position": position,
                    "throwBat": throwbat,
                    "birth": _parse_date(birth),
                    "body": body,
                    "school": school,
                }
                players.append(player)
            print(f"{TEAM_CODES.get(code, code)}: {len(players)}명 (페이지 {page_num} 이동, 실제 페이지: {current_page})")
            if page_num >= 5:
                break
            page_num += 1
            # 페이지 번호 버튼 클릭
            btn_id = f"cphContents_cphContents_cphContents_ucPager_btnNo{page_num}"
            try:
                btn = driver.find_element(By.ID, btn_id)
                btn.click()
                time.sleep(2.5)
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table.tEx")))
            except Exception as e:
                print(f"[ERROR] {TEAM_CODES.get(code, code)}: 페이지 {page_num} 버튼 클릭 실패: {e}")
                break
        except Exception as e:
            print(f"[ERROR] {TEAM_CODES.get(code, code)}: 페이지 {page_num} 처리 중 오류: {e}")
            break
    print(f"{TEAM_CODES.get(code, code)} 최종: {len(players)}명 크롤링 완료")
    return players


def crawl_players() -> list:
    options = Options()
    options.add_argument("--headless=new")  # headless 모드로 다시 실행
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()), options=options
    )
    driver.get("https://www.koreabaseball.com/Player/Search.aspx")
    wait = WebDriverWait(driver, 10)
    wait.until(
        EC.presence_of_element_located(
            (By.ID, "cphContents_cphContents_cphContents_ddlTeam")
        )
    )

    all_players = []
    team_counts = {}
    for code in TEAM_CODES:
        team_players = _scrape_team(driver, code)
        all_players.extend(team_players)
        team_counts[TEAM_CODES.get(code, code)] = len(team_players)

    driver.quit()
    print("\n===== 팀별 선수 수 요약 =====")
    for team, count in team_counts.items():
        print(f"{team}: {count}명")
    print(f"전체 합계: {len(all_players)}명")
    return all_players


def save_players(players: list, path: str = "public/data/kboPlayers.json") -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(players, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    players = crawl_players()
    save_players(players)
    print(f"Saved {len(players)} players")
