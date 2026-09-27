#!/usr/bin/env python3
"""Crawl the KBO 1군 (active) roster per team per day.

Source: https://www.koreabaseball.com/Player/Register.aspx (ASP.NET postback with
hfSearchTeam / hfSearchDate). Output keeps a rolling window of days so the app can
tell who is on the active roster and who was recently called up (등록) or sent
down (말소). A player sent down cannot be re-registered for 10 days.

Outputs:
  public/data/kboPitcherRoster.json  (starter projections)
    {"updatedAt": ..., "days": {"2026-09-26": {"KIA": ["네일", ...], ...}, ...},
     "others": {"2026-09-26": {"KIA": {"포수": [...], "내야수": [...], "외야수": [...]}}},
     "removed": {"KIA": {"황동하": "2026-09-10"}, ...}}   # latest 말소 date per pitcher
  public/data/kboActiveRoster.json   (explore tab: who is on the 1군 now)
    {"updatedAt": ..., "date": "2026-09-26",
     "teams": {"KIA": {"투수": [...], "포수": [...], "내야수": [...], "외야수": [...]}},
     "moves": [{"date", "team", "name", "position", "type": "up"|"down", "returnOn"?}]}
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
ACTIVE_OUT = ROOT / "public" / "data" / "kboActiveRoster.json"
POSITIONS = ["투수", "포수", "내야수", "외야수"]
REREGISTER_DAYS = 10
MOVES_DAYS = 14
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
        roster = self.roster(team_code, day)
        return None if roster is None else roster["투수"]

    def roster(self, team_code: str, day: date) -> dict[str, list[str]] | None:
        """{포지션: [이름]} for players registered on that day, None if the page failed."""
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
        roster: dict[str, list[str]] = {pos: [] for pos in POSITIONS}
        for table in self.soup.find_all("table"):
            headers = [th.get_text(strip=True) for th in table.find_all("th")]
            pos = next((h for h in headers if h in roster), None)
            if not pos:
                continue
            col = headers.index(pos)
            for tr in table.find_all("tr")[1:]:
                cells = [td.get_text(strip=True) for td in tr.find_all("td")]
                if len(cells) > col and cells[col]:
                    roster[pos].append(cells[col])
        return roster


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


def full_roster(days: dict, others: dict, day: str, team: str) -> dict[str, list[str]] | None:
    if team not in days.get(day, {}) or team not in others.get(day, {}):
        return None
    return {"투수": days[day][team], **others[day][team]}


def compute_moves(days: dict, others: dict, since: str) -> list[dict]:
    """등록(up)/말소(down) between consecutive stored days, newest first."""
    moves: list[dict] = []
    ordered = sorted(d for d in days if d in others)
    for prev, cur in zip(ordered, ordered[1:]):
        if cur < since:
            continue
        for team in TEAM_CODES:
            before, after = full_roster(days, others, prev, team), full_roster(days, others, cur, team)
            if not before or not after:
                continue
            pos_before = {n: p for p, names in before.items() for n in names}
            pos_after = {n: p for p, names in after.items() for n in names}
            for name in sorted(set(pos_after) - set(pos_before)):
                moves.append({"date": cur, "team": team, "name": name, "position": pos_after[name], "type": "up"})
            for name in sorted(set(pos_before) - set(pos_after)):
                back = (date.fromisoformat(cur) + timedelta(days=REREGISTER_DAYS)).isoformat()
                moves.append({"date": cur, "team": team, "name": name, "position": pos_before[name],
                              "type": "down", "returnOn": back})
    return sorted(moves, key=lambda m: (m["date"], m["type"] == "up"), reverse=True)


def active_roster(days: dict, others: dict, end: date) -> dict | None:
    complete = [d for d in sorted(days) if d in others and len(others[d]) == len(TEAM_CODES)]
    if not complete:
        return None
    latest = complete[-1]
    since = (end - timedelta(days=MOVES_DAYS)).isoformat()
    return {
        "source": "KBO 선수 등록 현황",
        "date": latest,
        "teams": {t: full_roster(days, others, latest, t) for t in TEAM_CODES},
        "moves": compute_moves(days, others, since),
    }


def write_if_changed(path: Path, result: dict) -> bool:
    old = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    if {k: v for k, v in old.items() if k != "updatedAt"} == {k: v for k, v in result.items() if k != "updatedAt"}:
        return False
    path.write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    today = datetime.now(KST).date()
    parser.add_argument("--start", help="YYYY-MM-DD (default: today - keep_days)")
    parser.add_argument("--end", help="YYYY-MM-DD (default: today)")
    parser.add_argument("--keep-days", type=int, default=21, help="0 = keep everything")
    parser.add_argument("--out", default=str(OUT))
    parser.add_argument("--refetch", action="store_true", help="refetch days already stored")
    parser.add_argument("--active-out", default=str(ACTIVE_OUT))
    args = parser.parse_args()

    out = Path(args.out)
    data = json.loads(out.read_text(encoding="utf-8")) if out.exists() else {}
    days: dict[str, dict[str, list[str]]] = data.get("days", {})
    others: dict[str, dict[str, dict[str, list[str]]]] = data.get("others", {})

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
        complete = (
            key in days and len(days[key]) == len(TEAM_CODES)
            and key in others and len(others[key]) == len(TEAM_CODES)
        )
        if complete and d < today and not args.refetch:
            d += timedelta(days=1)
            continue
        day_pitchers: dict[str, list[str]] = {}
        day_others: dict[str, dict[str, list[str]]] = {}
        for team, code in TEAM_CODES.items():
            roster = client.roster(code, d)
            # 당일 엔트리가 아직 공시되지 않았으면 빈 목록이 온다 → 저장하지 않음
            if roster and roster["투수"]:
                day_pitchers[team] = roster["투수"]
                day_others[team] = {p: roster[p] for p in POSITIONS[1:]}
        if day_pitchers:
            days[key] = day_pitchers
            others[key] = day_others
            fetched += 1
            print(f"📋 {key}: " + ", ".join(f"{t} {len(v)}" for t, v in day_pitchers.items()))
        d += timedelta(days=1)

    if args.keep_days:
        cutoff = (end - timedelta(days=args.keep_days)).isoformat()
        days = {k: v for k, v in days.items() if k >= cutoff}
        others = {k: v for k, v in others.items() if k >= cutoff}

    now = datetime.now(KST).isoformat(timespec="seconds")
    result = {
        "updatedAt": now,
        "source": "KBO 선수 등록 현황",
        "days": dict(sorted(days.items())),
        "others": dict(sorted(others.items())),
        "removed": compute_removed(days),
    }
    if write_if_changed(out, result):
        print(f"💾 {out} ({len(days)}일, 새로 받은 날 {fetched})")
    else:
        print("⏸️ 변경 없음")
    active = active_roster(days, others, end)
    if active and write_if_changed(Path(args.active_out), {"updatedAt": now, **active}):
        ups = sum(m["type"] == "up" for m in active["moves"])
        print(f"💾 {args.active_out} ({active['date']} 기준, 최근 {MOVES_DAYS}일 등록 {ups}·말소 {len(active['moves']) - ups})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
