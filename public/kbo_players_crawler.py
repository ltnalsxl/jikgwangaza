"""KBO 선수 명단 크롤러 (koreabaseball.com 선수 조회).

예전 Selenium 버전은 팀당 최대 5페이지(100명)까지만 읽어서, 이름순으로 뒤에 오는
선수(예: 롯데 황성빈)가 명단에서 통째로 빠지는 문제가 있었다. 이 버전은 ASP.NET
postback을 requests로 직접 호출해 모든 페이지를 읽는다.
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime

import requests
from bs4 import BeautifulSoup

URL = "https://www.koreabaseball.com/Player/Search.aspx"
PREFIX = "ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$"

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

MIN_PLAYERS_PER_TEAM = 40
MAX_PAGES = 30


def _parse_date(text: str) -> str:
    """Convert 'YYYY-MM-DD' into ISO format used in data."""
    try:
        return datetime.strptime(text, "%Y-%m-%d").isoformat() + "Z"
    except ValueError:
        return text


def _hidden_fields(soup: BeautifulSoup) -> dict:
    return {
        i["name"]: i.get("value", "")
        for i in soup.select("input[type=hidden]")
        if i.get("name")
    }


class RosterClient:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
            ),
            "Accept-Language": "ko-KR,ko;q=0.9",
        })

    def _request(self, method: str, **kwargs) -> BeautifulSoup:
        last_error = None
        for attempt in range(1, 4):
            try:
                resp = self.session.request(method, URL, timeout=30, **kwargs)
                resp.raise_for_status()
                return BeautifulSoup(resp.text, "html.parser")
            except requests.RequestException as e:
                last_error = e
                time.sleep(2 * attempt)
        raise RuntimeError(f"KBO 선수 조회 요청 실패: {last_error}")

    def _postback(self, soup: BeautifulSoup, target: str, team: str, page: str = "") -> BeautifulSoup:
        data = _hidden_fields(soup)
        data.update({
            "__EVENTTARGET": target,
            "__EVENTARGUMENT": "",
            PREFIX + "ddlTeam": team,
            PREFIX + "ddlPosition": "",
            PREFIX + "txtSearchPlayerName": "",
            PREFIX + "hfPage": page,
        })
        return self._request("POST", data=data)

    @staticmethod
    def _parse_rows(soup: BeautifulSoup, code: str) -> list:
        players = []
        for row in soup.select("table.tEx tbody tr"):
            tds = row.find_all("td")
            cols = [c.get_text(strip=True) for c in tds]
            if len(cols) < 7:
                continue
            if len(cols) == 7:
                number, name, _team, position, birth, body, school = cols
                throwbat = ""
            else:
                number, name, _team, position, throwbat, birth, body, school = cols[:8]

            player_id = ""
            link = row.find("a", href=True)
            if link:
                m = re.search(r"playerId=(\d+)", link["href"])
                if m:
                    player_id = m.group(1)

            players.append({
                "teamCode": code,
                "teamName": TEAM_CODES.get(code, ""),
                "number": number,
                "playerName": name,
                "position": position,
                "throwBat": throwbat,
                "birth": _parse_date(birth),
                "body": body,
                "school": school,
                "playerId": player_id,
            })
        return players

    @staticmethod
    def _next_page_target(soup: BeautifulSoup, next_page: int):
        """다음 페이지 링크의 postback target. 페이저는 5개 단위 블록이라 번호 텍스트로 찾고, 없으면 '다음' 버튼."""
        anchors = soup.select("a[id*='ucPager_btn']")
        candidates = [a for a in anchors if a.get_text(strip=True) == str(next_page)]
        if not candidates:
            candidates = [a for a in anchors if (a.get("id") or "").endswith("ucPager_btnNext")]
        for a in candidates:
            m = re.search(r"__doPostBack\('([^']+)'", a.get("href") or "")
            if m:
                return m.group(1)
        return None

    def scrape_team(self, code: str) -> list:
        soup = self._request("GET")
        soup = self._postback(soup, PREFIX + "ddlTeam", code)

        players, seen = [], set()
        page = 1
        while page <= MAX_PAGES:
            rows = self._parse_rows(soup, code)
            new_rows = [p for p in rows if (p["playerId"] or p["playerName"] + p["number"]) not in seen]
            if not new_rows:
                break
            for p in new_rows:
                seen.add(p["playerId"] or p["playerName"] + p["number"])
            players.extend(new_rows)

            target = self._next_page_target(soup, page + 1)
            if not target:
                break
            page += 1
            soup = self._postback(soup, target, code, str(page))
            time.sleep(0.5)

        print(f"{TEAM_CODES[code]}: {len(players)}명 ({page}페이지)")
        return players


def crawl_players() -> list:
    client = RosterClient()
    all_players = []
    for code in TEAM_CODES:
        team_players = client.scrape_team(code)
        if len(team_players) < MIN_PLAYERS_PER_TEAM:
            raise RuntimeError(
                f"{TEAM_CODES[code]} 선수가 {len(team_players)}명뿐입니다. 사이트 구조 변경 가능성 — 기존 데이터를 유지합니다."
            )
        all_players.extend(team_players)
    print(f"전체 합계: {len(all_players)}명")
    return all_players


def save_players(players: list, path: str = "public/data/kboPlayers.json") -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(players, f, ensure_ascii=False, indent=2)


def main() -> int:
    parser = argparse.ArgumentParser(description="KBO roster crawler")
    parser.add_argument("--output", default="public/data/kboPlayers.json")
    args = parser.parse_args()

    players = crawl_players()
    save_players(players, args.output)
    print(f"Saved {len(players)} players to {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
