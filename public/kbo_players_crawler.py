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
    # Wait for the table to load after selecting the team
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table.tEx")))
    players = []

    # Determine event target prefix for pagination buttons
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

    page_num = 1
    while page_num <= last_page:
        # Ensure the table is present before parsing
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table.tEx")))
        soup = BeautifulSoup(driver.page_source, "html.parser")
        table = soup.find("table", class_="tEx")
        if not table:
            break
        rows = table.find("tbody").find_all("tr")
        for row in rows:
            cols = [c.get_text(strip=True) for c in row.find_all("td")]
            if len(cols) < 7:
                continue

            # Some pages omit the throw/bat column
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
        if page_num >= last_page:
            break

        page_num += 1
        event_target = f"{prefix}{page_num}"
        driver.execute_script("__doPostBack(arguments[0], '')", event_target)

        print(
            f"{TEAM_CODES.get(code, code)}: {len(players)}명 (페이지 {page_num} 이동)"
        )

        time.sleep(1)
        wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "table.tEx"))
        )

    print(f"{TEAM_CODES.get(code, code)} 최종: {len(players)}명 크롤링 완료")
    return players


def crawl_players() -> list:
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    driver = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()), options=options
    )
    # Start from the player search page which lists all players by team
    driver.get("https://www.koreabaseball.com/Player/Search.aspx")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located(
            (By.ID, "cphContents_cphContents_cphContents_ddlTeam")
        )
    )

    all_players = []
    team_counts = {}
    for code in TEAM_CODES:
        # 드롭다운을 매번 새로 찾음
        wait.until(EC.presence_of_element_located((By.ID, "cphContents_cphContents_cphContents_ddlTeam")))
        select = Select(driver.find_element(By.ID, "cphContents_cphContents_cphContents_ddlTeam"))
        select.select_by_value(code)
        # 이후 크롤링 진행
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
