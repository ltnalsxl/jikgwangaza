#!/usr/bin/env python3
"""Crawl KBO 1군 registered pitchers per team per day.

Source: https://www.koreabaseball.com/Player/Register.aspx (ASP.NET postback with
hfSearchTeam / hfSearchDate). Output keeps a rolling window of days so the app can
tell who is on the active roster and who was recently sent down (말소). A pitcher
sent down cannot be re-registered for 10 days.

Output: public/data/kboPitcherRoster.json
  {"updatedAt": ..., "days": {"2026-09-26": {"KIA": ["네일", ...], ...}, ...},
   "removed": {"KIA": {"황동하": "2026-09-10"}, ...}}   # latest 말소 date per pitcher
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data" / "kboPitcherRoster.json"
URL = "https://www.koreabaseball.com/Player/Register.aspx"
PREFIX = "ctl00$ctl00$ctl00$cphContents$cphContents$cphContents$"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
TEAM_CODES = {
    "KIA": "HT", "삼성": "SS", "LG": "LG", "두산": "OB", "KT": "KT",
    "SSG": "SK", "롯데": "LT", "한화": "HH", "NC": "NC", "키움": "WO",
}
KST = timezone(timedelta(hours=9))


class RegisterClient:
    def __init__(self, delay: float = 0.3):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": UA, "Referer": URL})
        self.delay = delay
        self.soup = BeautifulSoup(self.session.get(URL, timeout=20).text, "html.parser")

    def pitchers(self, team_code: str, day: date) -> list[str] | None:
        form = {
            i.get("name"): i.get("value", "")
            for i in self.soup.find_all("input", type="hidden")
            if i.get("name")
        }
        form["__EVENTTARGET"] = PREFIX + "btnCalendarSelect"
        form[PREFIX + "hfSearchTeam"] = team_code
        form[PREFIX + "hfSearchDate"] = day.strftime("%Y%m%d")
        for attempt in range(3):
            try:
                resp = self.session.post(URL, data=form, timeout=20)
                resp.raise_for_status()
                break
            except requests.RequestException as exc:
                if attempt == 2:
                    print(f"⚠️ {team_code} {day}: {exc}")
                    return None
                time.sleep(2 * (attempt + 1))
        time.sleep(self.delay)
        self.soup = BeautifulSoup(resp.text, "html.parser")
        shown = self.soup.select_one("#cphContents_cphContents_cphContents_lblGameDate")
        if not shown or not shown.get_text(strip=True).startswith(day.strftime("%Y.%m.%d")):
            return None
        names: list[str] = []
        for table in self.soup.find_all("table"):
            headers = [th.get_text(strip=True) for th in table.find_all("th")]
            if "투수" not in headers:
                continue
            col = headers.index("투수")
            for tr in table.find_all("tr")[1:]:
                cells = [td.get_text(strip=True) for td in tr.find_all("td")]
                if len(cells) > col and cells[col]:
                    names.append(cells[col])
        return names


def compute_removed(days: dict[str, dict[str, list[str]]]) -> dict[str, dict[str, str]]:
    """Latest date each pitcher disappeared from the roster (말소 effective date)."""
    removed: dict[str, dict[str, str]] = {}
    ordered = sorted(days)
    for prev, cur in zip(ordered, ordered[1:]):
        for team, names in days[cur].items():
            before = set(days[prev].get(team, []))
            for name in before - set(names):
                removed.setdefault(team, {})[name] = cur
            for name in set(names) - before:
                removed.get(team, {}).pop(name, None)
    return removed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    today = datetime.now(KST).date()
    parser.add_argument("--start", help="YYYY-MM-DD (default: today - keep_days)")
    parser.add_argument("--end", help="YYYY-MM-DD (default: today)")
    parser.add_argument("--keep-days", type=int, default=21, help="0 = keep everything")
    parser.add_argument("--out", default=str(OUT))
    parser.add_argument("--refetch", action="store_true", help="refetch days already stored")
    args = parser.parse_args()

    out = Path(args.out)
    data = json.loads(out.read_text(encoding="utf-8")) if out.exists() else {}
    days: dict[str, dict[str, list[str]]] = data.get("days", {})

    end = date.fromisoformat(args.end) if args.end else today
    start = (
        date.fromisoformat(args.start)
        if args.start
        else end - timedelta(days=max(args.keep_days, 1))
    )

    client = RegisterClient()
    d = start
    fetched = 0
    while d <= end:
        key = d.isoformat()
        # 과거 날짜는 바뀌지 않으므로 이미 있으면 건너뛴다(오늘은 항상 갱신)
        if key in days and d < today and not args.refetch and len(days[key]) == len(TEAM_CODES):
            d += timedelta(days=1)
            continue
        day_rosters: dict[str, list[str]] = {}
        for team, code in TEAM_CODES.items():
            names = client.pitchers(code, d)
            if names:
                day_rosters[team] = names
        if day_rosters:
            days[key] = day_rosters
            fetched += 1
            print(f"📋 {key}: " + ", ".join(f"{t} {len(v)}" for t, v in day_rosters.items()))
        d += timedelta(days=1)

    if args.keep_days:
        cutoff = (end - timedelta(days=args.keep_days)).isoformat()
        days = {k: v for k, v in days.items() if k >= cutoff}

    result = {
        "updatedAt": datetime.now(KST).isoformat(timespec="seconds"),
        "source": "KBO 선수 등록 현황",
        "days": dict(sorted(days.items())),
        "removed": compute_removed(days),
    }
    new_text = json.dumps(result, ensure_ascii=False, indent=1)
    old = json.loads(out.read_text(encoding="utf-8")) if out.exists() else {}
    if {k: v for k, v in old.items() if k != "updatedAt"} == {
        k: v for k, v in result.items() if k != "updatedAt"
    }:
        print("⏸️ 변경 없음")
        return 0
    out.write_text(new_text + "\n", encoding="utf-8")
    print(f"💾 {out} ({len(days)}일, 새로 받은 날 {fetched})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
