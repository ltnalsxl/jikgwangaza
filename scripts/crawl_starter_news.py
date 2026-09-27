#!/usr/bin/env python3
"""Collect recent starting-pitcher news per team (Google News RSS, no API key).

Only headlines from established outlets are kept, and only headlines that mention a
pitcher of that team (current 1군 pitchers + recent starters). Each headline gets a
rule-based signal:
  out     – 말소/부상/이탈/재활/불펜 전환 등 로테이션 이탈 가능성
  return  – 부상·말소 후 복귀/콜업/1군 등록
  start   – 선발 예고/등판 예정/출격 등 앞으로의 등판 계획
  mention – 그 외 언급(리뷰 등)
The app shows these as evidence next to projections; only fresh "out" signals lower
the confidence of a projection. Nothing here overrides the official roster data.

Output: public/data/starterNews.json
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data"
OUT = DATA / "starterNews.json"
KST = timezone(timedelta(hours=9))
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0 Safari/537.36"

TEAMS = ["KIA", "삼성", "LG", "두산", "KT", "SSG", "롯데", "한화", "NC", "키움"]
QUERY_NAMES = {"KIA": "KIA 타이거즈", "KT": "KT 위즈", "NC": "NC 다이노스", "SSG": "SSG 랜더스"}

TRUSTED_SOURCES = [
    "스포츠조선", "스포츠서울", "일간스포츠", "스포츠동아", "스포츠경향", "스포츠월드", "스포츠한국",
    "스포티비", "SPOTV", "OSEN", "오센", "연합뉴스", "뉴스1", "뉴시스", "마이데일리", "스타뉴스",
    "엑스포츠뉴스", "조이뉴스24", "MK스포츠", "매일경제", "한국경제", "머니투데이", "이데일리",
    "조선일보", "중앙일보", "동아일보", "한국일보", "경향신문", "한겨레", "서울신문", "국민일보",
    "세계일보", "헤럴드경제", "아시아경제", "파이낸셜뉴스", "노컷뉴스", "데일리안", "KBS", "MBC",
    "SBS", "JTBC", "YTN", "스포츠투데이", "인터풋볼", "베스트일레븐", "v.daum.net",
]

OUT_WORDS = ["말소", "부상", "이탈", "재활", "수술", "엔트리 제외", "불펜 전환", "불펜으로", "시즌 아웃",
             "시즌아웃", "통증", "휴식 차원", "로테이션 제외", "로테이션 거른", "건너뛴", "한 턴 거",
             "조기 마감", "시즌 마감", "추가 등판 없", "등판 없다"]
RETURN_WORDS = ["복귀", "콜업", "1군 등록", "1군 합류", "돌아온", "돌아왔"]
START_WORDS = ["선발 예고", "선발예고", "예고", "등판 예정", "출격", "나선다", "나온다", "등판한다", "선발 등판",
               "로테이션 합류", "선발로", "선발 투입", "투입 예정", "선발 중책", "선발 확정", "낙점", "더 던진다",
               "휴식 등판", "등판 순서", "프리뷰"]
REVIEW_RE = re.compile(r"(?<!프)리뷰|강판|호투|완벽투|역투|승리|패전|QS|무실점|KKK|실점|교체")
SKIP_WORDS = ["AI프리뷰", "[AI", "사진]", "[포토", "포토]", "화보", "영상]", "오늘의 Pick"]
# 국가대표 경기 기사는 소속팀 로테이션과 무관
NATIONAL_RE = re.compile(r"(?<![A-Za-z])AG(?![A-Za-z])|아시안게임|대표팀|국대|한일전|일본전|중국전|대만전|슈퍼라운드|나고야|도요하시|류지현호")
SIGNAL_ORDER = {"out": 0, "return": 1, "start": 2, "mention": 3}
CLAUSE_SPLIT = re.compile(r"[,…!?\[\]'\"“”‘’()|;:]|\.\.\.|→|↔")


def classify(text: str) -> str:
    has = lambda words: any(w in text for w in words)
    if has(OUT_WORDS):
        return "return" if has(RETURN_WORDS) and not has(["말소", "이탈", "제외"]) else "out"
    if has(RETURN_WORDS):
        return "return"
    if has(START_WORDS) and not REVIEW_RE.search(text):
        return "start"
    return "mention"


PLAN_DAY_RE = re.compile(r"(?<!\d)(\d{1,2})일\s*(?:[가-힣A-Za-z]{1,4}전|선발|등판|프리뷰|경기)")


def resolve_day(day: int, published: datetime) -> str | None:
    """'27일' 같은 일(day)만 있는 표현을 기사 날짜 기준 가장 가까운 날짜로 바꾼다."""
    candidates = []
    for month_shift in (-1, 0, 1):
        y, m = published.year, published.month + month_shift
        if m == 0:
            y, m = y - 1, 12
        elif m == 13:
            y, m = y + 1, 1
        try:
            candidates.append(datetime(y, m, day, tzinfo=KST))
        except ValueError:
            continue
    if not candidates:
        return None
    best = min(candidates, key=lambda d: abs((d - published).total_seconds()))
    # 기사보다 하루 넘게 과거거나 열흘 넘게 먼 날짜는 계획으로 보지 않는다
    if best.date() < published.date() - timedelta(days=1) or best - published > timedelta(days=10):
        return None
    return best.date().isoformat()


def planned_dates(title: str, signals: dict[str, str], published: datetime) -> dict[str, str]:
    """선발 계획 기사에서 '나균안 27일 한화전'처럼 투수와 날짜가 같이 나온 경우만 뽑는다."""
    clauses = [c.strip() for c in CLAUSE_SPLIT.split(title) if c.strip()]
    starters = [n for n, sig in signals.items() if sig == "start"]
    plans = {}
    for name in starters:
        scopes = [c for c in clauses if mentions(c, name)]
        if len(signals) == 1:
            scopes.append(title)
        for scope in scopes:
            days = {int(m.group(1)) for m in PLAN_DAY_RE.finditer(scope)}
            if len(days) == 1:
                resolved = resolve_day(days.pop(), published)
                if resolved:
                    plans[name] = resolved
                    break
    return plans


def pitcher_signals(title: str, names: list[str]) -> dict[str, str]:
    """이름이 들어간 구절만 보고 투수별 신호를 정한다(다른 선수 소식과 섞이지 않게)."""
    clauses = [c.strip() for c in CLAUSE_SPLIT.split(title) if c.strip()]
    out = {}
    for name in names:
        best = "mention"
        for clause in clauses:
            if mentions(clause, name):
                sig = classify(clause)
                if SIGNAL_ORDER[sig] < SIGNAL_ORDER[best]:
                    best = sig
        out[name] = best
    whole = classify(title)
    for name in names:
        if out[name] != "mention":
            continue
        # 프리뷰 기사에 나온 투수는 그 경기 선발, 투수가 한 명뿐인 제목은 제목 전체로 판단(등판 계획만)
        if "프리뷰" in title or (len(names) == 1 and whole == "start"):
            out[name] = "start"
    return out


def clean_title(title: str, source: str) -> str:
    title = title.strip()
    for _ in range(2):
        for suffix in (f" - {source}", " - v.daum.net"):
            if title.endswith(suffix):
                title = title[: -len(suffix)].rstrip()
    return title


def is_trusted(source: str) -> bool:
    return any(s.lower() in source.lower() for s in TRUSTED_SOURCES)


def load_pitchers() -> dict[str, set[str]]:
    """Current 1군 pitchers (kboPitcherRoster.json) + recent starters (season bundle)."""
    pitchers: dict[str, set[str]] = {t: set() for t in TEAMS}
    roster_path = DATA / "kboPitcherRoster.json"
    if roster_path.exists():
        days = json.loads(roster_path.read_text(encoding="utf-8")).get("days", {})
        for day in sorted(days)[-14:]:
            for team, names in days[day].items():
                pitchers.setdefault(team, set()).update(names)
    year = datetime.now(KST).year
    bundle = DATA / "kbo_crawler_data" / f"season-{year}.json"
    if bundle.exists():
        cutoff = (datetime.now(KST) - timedelta(days=45)).date().isoformat()
        for g in json.loads(bundle.read_text(encoding="utf-8")):
            if g.get("date", "") < cutoff:
                continue
            for side in (g.get("starting_lineups") or {}).values():
                name = ((side or {}).get("starting_pitcher") or {}).get("name")
                if name and side.get("team_name") in pitchers:
                    pitchers[side["team_name"]].add(name)
            for t in g.get("teams", []):
                key = "home_starter_name" if t.get("is_home") else "away_starter_name"
                if g.get(key) and t.get("name") in pitchers:
                    pitchers[t["name"]].add(g[key])
    # 두 글자 이름은 오탐(예: '이상', '정우')이 많아 제목에서 경계 검사로만 매칭한다
    return {t: {n for n in names if len(n) >= 2} for t, names in pitchers.items()}


def mentions(title: str, name: str) -> bool:
    if len(name) >= 3:
        return name in title
    particles = "이|가|은|는|을|를|과|와|의|도|만|에|로|으로|에게|까지|부터|이다|이라|마저|조차"
    return re.search(rf"(?<![가-힣]){re.escape(name)}(?:{particles})?(?![가-힣])", title) is not None


def fetch_rss(query: str) -> list[dict]:
    url = "https://news.google.com/rss/search?" + urllib.parse.urlencode(
        {"q": query, "hl": "ko", "gl": "KR", "ceid": "KR:ko"}
    )
    for attempt in range(3):
        try:
            resp = requests.get(url, headers={"User-Agent": UA}, timeout=20)
            resp.raise_for_status()
            root = ET.fromstring(resp.content)
            break
        except (requests.RequestException, ET.ParseError) as exc:
            if attempt == 2:
                print(f"⚠️ RSS 실패 {query}: {exc}")
                return []
            time.sleep(2 * (attempt + 1))
    items = []
    for it in root.iter("item"):
        source = (it.findtext("source") or "").strip()
        try:
            published = parsedate_to_datetime(it.findtext("pubDate") or "").astimezone(KST)
        except (TypeError, ValueError):
            continue
        items.append({
            "title": clean_title(it.findtext("title") or "", source),
            "link": (it.findtext("link") or "").strip(),
            "source": source,
            "publishedAt": published.isoformat(timespec="minutes"),
        })
    return items


def collect(days: int, per_team: int) -> dict:
    pitchers = load_pitchers()
    since = datetime.now(KST) - timedelta(days=days)
    teams: dict[str, list[dict]] = {}
    for team in TEAMS:
        q = QUERY_NAMES.get(team, team)
        seen: set[str] = set()
        rows: list[dict] = []
        for query in (f"{q} 선발 when:{days}d", f"{q} 투수 말소 OR 부상 OR 복귀 OR 로테이션 when:{days}d"):
            for item in fetch_rss(query):
                title = item["title"]
                key = re.sub(r"\W", "", title)[:40]
                if key in seen or not is_trusted(item["source"]):
                    continue
                if any(w in title for w in SKIP_WORDS) or NATIONAL_RE.search(title):
                    continue
                if datetime.fromisoformat(item["publishedAt"]) < since:
                    continue
                named = sorted(n for n in pitchers.get(team, ()) if mentions(title, n))
                if not named:
                    continue
                seen.add(key)
                signals = pitcher_signals(title, named)
                top = min(signals.values(), key=SIGNAL_ORDER.__getitem__)
                row = {**item, "pitchers": named, "signals": signals, "signal": top}
                plans = planned_dates(title, signals, datetime.fromisoformat(item["publishedAt"]))
                if plans:
                    row["plans"] = plans
                rows.append(row)
            time.sleep(0.5)
        rows.sort(key=lambda r: r["publishedAt"], reverse=True)
        # 신호가 강한 기사를 우선 남기되 최신순 유지
        keep = sorted(rows, key=lambda r: SIGNAL_ORDER[r["signal"]])[:per_team]
        teams[team] = sorted(keep, key=lambda r: r["publishedAt"], reverse=True)
        print(f"📰 {team}: {len(rows)}건 중 {len(teams[team])}건")
    return {
        "updatedAt": datetime.now(KST).isoformat(timespec="seconds"),
        "source": "Google News RSS (주요 언론사만)",
        "teams": teams,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=4)
    parser.add_argument("--per-team", type=int, default=8)
    parser.add_argument("--out", default=str(OUT))
    args = parser.parse_args()
    result = collect(args.days, args.per_team)
    if not any(result["teams"].values()):
        print("⚠️ 기사를 하나도 못 가져와 기존 파일을 유지합니다")
        return 0
    out = Path(args.out)
    if out.exists():
        old = json.loads(out.read_text(encoding="utf-8"))
        if old.get("teams") == result["teams"]:
            print("⏸️ 변경 없음")
            return 0
    out.write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"💾 {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
