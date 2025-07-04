import os
import json
from datetime import datetime
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# Mapping of Korean column headers to English keys
HEADER_MAP = {
    "순위": "rank",
    "팀": "team",
    "경기": "games",
    "승": "wins",
    "패": "losses",
    "무": "draws",
    "승률": "win_rate",
    "게임차": "gb",
    "연속": "streak",
}


def setup_driver(headless: bool = True):
    """Initialize Selenium WebDriver with mobile-like settings."""
    options = webdriver.ChromeOptions()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=390,844")  # iPhone 12 Pro size
    options.add_argument(
        "--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1"
    )
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    driver.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument",
        {
            "source": "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        },
    )
    wait = WebDriverWait(driver, 30)
    driver.implicitly_wait(10)
    return driver, wait


def fetch_team_ranks(
    url: str = "https://m.sports.naver.com/kbaseball/record/kbo?seasonCode=2025&tab=teamRank",
) -> list:
    """Fetch team rankings from Naver Sports."""
    driver, wait = setup_driver()
    try:
        driver.get(url)
        wait.until(lambda d: d.execute_script("return document.readyState") == "complete")
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div.Table_table__q50TY")))

        soup = BeautifulSoup(driver.page_source, "html.parser")
        table_div = soup.find("div", class_="Table_table__q50TY")
        if not table_div:
            return []
        table = table_div.find("table") or table_div

        headers = [th.get_text(strip=True) for th in table.select("thead th")]
        keys = [HEADER_MAP.get(h, h) for h in headers]
        ranks = []

        for tr in table.select("tbody tr"):
            cells = [td.get_text(strip=True) for td in tr.find_all(["th", "td"])]
            if not cells:
                continue
            row = {}
            for i, cell in enumerate(cells):
                key = keys[i] if i < len(keys) else f"col{i+1}"
                row[key] = cell
            ranks.append(row)
        return ranks
    finally:
        driver.quit()


def save_ranks(ranks: list, path: str = "public/data/teamRank.json") -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = {
        "crawl_time": datetime.now().isoformat(),
        "results": ranks,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    ranks = fetch_team_ranks()
    save_ranks(ranks)
    print(f"Saved {len(ranks)} rows to public/data/teamRank.json")
