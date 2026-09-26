"""KBO 팀 순위 크롤러.

네이버 스포츠 통계 API(JSON)를 사용한다. 예전에는 Selenium으로 모바일 페이지를
긁었지만 클래스명이 바뀔 때마다 깨졌고, 실패해도 워크플로가 성공으로 끝나서
순위가 몇 달씩 갱신되지 않는 문제가 있었다.
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from zoneinfo import ZoneInfo

import requests

KST = ZoneInfo("Asia/Seoul")
API_URL = "https://api-gw.sports.naver.com/statistics/categories/kbo/seasons/{season}/teams"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 "
        "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    ),
    "Referer": "https://m.sports.naver.com/",
    "Accept": "application/json",
}


def _fmt(value, digits=3):
    if value is None or value == "":
        return ""
    try:
        return f"{float(value):.{digits}f}"
    except (TypeError, ValueError):
        return str(value)


def _gb(value):
    if value is None or value == "":
        return ""
    try:
        return f"{float(value):.1f}"
    except (TypeError, ValueError):
        return str(value)


def fetch_season_stats(season: int, retries: int = 3) -> list:
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            resp = requests.get(API_URL.format(season=season), headers=HEADERS, timeout=15)
            resp.raise_for_status()
            payload = resp.json()
            if not payload.get("success"):
                raise ValueError(payload.get("message") or "API returned success=false")
            stats = (payload.get("result") or {}).get("seasonTeamStats") or []
            return [s for s in stats if s.get("gameType", "REGULAR_SEASON") == "REGULAR_SEASON"]
        except Exception as e:  # noqa: BLE001 - retry on any network/parse error
            last_error = e
            print(f"⚠️ {season} 시즌 순위 조회 실패 ({attempt}/{retries}): {e}")
            time.sleep(2 * attempt)
    raise RuntimeError(f"순위 API 조회 실패: {last_error}")


def to_rank_rows(stats: list) -> list:
    rows = []
    for s in sorted(stats, key=lambda x: (x.get("ranking") or 99, x.get("orderNo") or 99)):
        opponent = s.get("opposingTeamName") or ""
        rows.append({
            "rank": str(s.get("ranking") or ""),
            "team": s.get("teamShortName") or s.get("teamName") or "",
            "team_code": s.get("teamId") or "",
            "win_rate": _fmt(s.get("wra")),
            "gb": _gb(s.get("gameBehind")),
            "games": str(s.get("gameCount") or 0),
            "wins": str(s.get("winGameCount") or 0),
            "losses": str(s.get("loseGameCount") or 0),
            "draws": str(s.get("drawnGameCount") or 0),
            "streak": s.get("continuousGameResult") or "",
            "batting_avg": _fmt(s.get("offenseHra")),
            "era": _fmt(s.get("defenseEra"), 2),
            "last_5": s.get("lastFiveGames") or "",
            "next_game": f"vs {opponent}" if opponent else "",
        })
    return rows


def fetch_team_ranks(season: int | None = None) -> tuple[int, list]:
    """현재 시즌 순위를 가져온다. 시즌 개막 전이면 직전 시즌 최종 순위를 사용한다."""
    season = season or datetime.now(KST).year
    rows = to_rank_rows(fetch_season_stats(season))
    played = sum(int(r["games"] or 0) for r in rows)
    if (not rows or played == 0) and season == datetime.now(KST).year:
        print(f"ℹ️ {season} 시즌 기록이 없어 {season - 1} 시즌 순위를 사용합니다.")
        season -= 1
        rows = to_rank_rows(fetch_season_stats(season))
    return season, rows


def validate(rows: list) -> None:
    if len(rows) != 10:
        raise ValueError(f"팀 수가 10개가 아닙니다: {len(rows)}")
    if any(not r["team"] or not r["rank"] for r in rows):
        raise ValueError("팀명/순위가 비어 있는 행이 있습니다")


def save_ranks(ranks: list, path: str = "public/data/teamRank.json", season: int | None = None) -> bool:
    """변경이 있을 때만 파일을 쓴다. 쓰면 True."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8") as f:
                prev = json.load(f)
            if prev.get("results") == ranks and prev.get("season") == season:
                print("⏸️ 순위 변경 없음")
                return False
        except (OSError, ValueError):
            pass

    data = {
        "crawl_time": datetime.now(KST).isoformat(timespec="seconds"),
        "season": season,
        "source": "naver_statistics_api",
        "results": ranks,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="KBO team rank crawler")
    parser.add_argument("--season", type=int, default=None)
    parser.add_argument("--output", default="public/data/teamRank.json")
    args = parser.parse_args()

    season, ranks = fetch_team_ranks(args.season)
    validate(ranks)
    changed = save_ranks(ranks, args.output, season)
    print(f"{'Saved' if changed else 'Unchanged'}: {season} 시즌 {len(ranks)}개 팀 → {args.output}")
    for r in ranks:
        print(f"  {r['rank']:>2} {r['team']:<4} {r['wins']}-{r['draws']}-{r['losses']} {r['win_rate']} GB {r['gb']} {r['last_5']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
