import json
import time
import re
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# Mapping from English site team codes to internal codes used in kboPlayers.json
TEAM_CODES = {
    "hh": "HH",
    "lg": "LG",
    "lt": "LT",
    "ht": "HT",
    "kt": "KT",
    "sk": "SK",
    "ss": "SS",
    "nc": "NC",
    "ob": "OB",
    "wo": "WO",
}

# Position categories used by the English site
POSITION_IDS = [
    "1",          # Pitcher
    "2",          # Catcher
    "3,4,5,6",    # Infielder
    "7,8,9",      # Outfielder
]


def _scrape_team(driver: webdriver.Chrome, code: str) -> list:
    """Return list of players for the given lowercase team ``code``."""
    players = []
    wait = WebDriverWait(driver, 10)

    # Switch to the team tab
    driver.execute_script(f"changeTeam('team', '{code}');")
    time.sleep(1.5)

    for pos in POSITION_IDS:
        driver.execute_script(f"changeTeam('', '{pos}');")
        time.sleep(1.5)
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div.tbl_common")))
        soup = BeautifulSoup(driver.page_source, "html.parser")
        for row in soup.select("div.tbl_common tbody tr"):
            name_link = row.select_one("th a.stats_player")
            if not name_link:
                continue
            name = name_link.get_text(strip=True)
            href = name_link.get("href", "")
            m = re.search(r"pcode=(\d+)", href)
            player_id = m.group(1) if m else ""
            cols = [td.get_text(strip=True) for td in row.find_all("td")]
            if len(cols) < 4:
                continue
            number, position, birth, ht_wt = cols[:4]
            players.append({
                "teamCode": TEAM_CODES.get(code, code).upper(),
                "number": number,
                "position": position,
                "birth": birth,
                "ht_wt": ht_wt,
                "playerNameEn": name,
                "playerId": player_id,
            })
    return players


def crawl_players_en() -> list:
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    driver.get("http://eng.koreabaseball.com/Teams/PlayerSearch.aspx")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div.tabarea"))
    )

    all_players = []
    for code in TEAM_CODES:
        all_players.extend(_scrape_team(driver, code))

    driver.quit()
    return all_players


def merge_with_korean(en_players: list, korean_path: str = "public/data/kboPlayers.json") -> list:
    """Merge English names into the Korean player list using ``playerId``."""
    with open(korean_path, "r", encoding="utf-8") as f:
        korean_players = json.load(f)

    en_map = {p.get("playerId"): p.get("playerNameEn") for p in en_players if p.get("playerId")}

    merged = []
    for kp in korean_players:
        name_en = en_map.get(kp.get("playerId"))
        merged.append({**kp, "playerNameEn": name_en})

    return merged


def save_players(players: list, path: str = "public/data/kboPlayersEn.json") -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(players, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    en_players = crawl_players_en()
    merged = merge_with_korean(en_players)
    save_players(merged)
    print(f"Saved {len(merged)} players to public/data/kboPlayersEn.json")
