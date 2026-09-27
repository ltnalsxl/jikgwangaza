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

It also keeps each team's latest general headlines (`news`), tagged with every team
named in the title, so a game's detail view can show head-to-head articles
(previews, reviews) first and then each team's own news.

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
FULL_NAMES = {
    "KIA": "KIA 타이거즈", "삼성": "삼성 라이온즈", "LG": "LG 트윈스", "두산": "두산 베어스",
    "KT": "KT 위즈", "SSG": "SSG 랜더스", "롯데": "롯데 자이언츠", "한화": "한화 이글스",
    "NC": "NC 다이노스", "키움": "키움 히어로즈",
}
_LATIN = lambda w: rf"(?<![A-Za-z]){w}(?![A-Za-z])"  # noqa: E731
TEAM_ALIASES = {
    "KIA": re.compile(rf"{_LATIN('KIA')}|기아|타이거즈", re.I),
    "삼성": re.compile(r"삼성|라이온즈", re.I),
    "LG": re.compile(rf"{_LATIN('LG')}|트윈스", re.I),
    "두산": re.compile(r"두산|베어스", re.I),
    "KT": re.compile(rf"{_LATIN('KT')}|위즈", re.I),
    "SSG": re.compile(rf"{_LATIN('SSG')}|랜더스", re.I),
    "롯데": re.compile(r"롯데|자이언츠", re.I),
    "한화": re.compile(r"한화|이글스", re.I),
    "NC": re.compile(rf"{_LATIN('NC')}|다이노스", re.I),
    "키움": re.compile(r"키움|히어로즈", re.I),
}

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
NATIONAL_WORDS = r"아시안게임|대표팀|국대|한일전|일본전|중국전|대만전|슈퍼라운드|나고야|도요하시|류지현호"
NATIONAL_RE = re.compile(rf"(?<![A-Za-z])AG(?![A-Za-z])|{NATIONAL_WORDS}")
# 팀 기사에서는 'AG 이후 장타 실종'처럼 복귀 후 소속팀 얘기는 남기고 대표팀 경기 기사만 뺀다
NATIONAL_STRONG_RE = re.compile(NATIONAL_WORDS)
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


def teams_in(title: str, unique_players: dict[str, str] | None = None) -> list[str]:
    """제목에 나온 팀. 팀명이 없어도 한 팀에만 있는 선수 이름이 나오면 그 팀으로 본다."""
    found = [t for t in TEAMS if TEAM_ALIASES[t].search(title)]
    for name, team in (unique_players or {}).items():
        if team not in found and mentions(title, name):
            found.append(team)
    return found


def unique_player_teams(players: dict[str, set[str]]) -> dict[str, str]:
    owners: dict[str, set[str]] = {}
    for team, names in players.items():
        for n in names:
            owners.setdefault(n, set()).add(team)
    return {n: next(iter(ts)) for n, ts in owners.items() if len(ts) == 1}


def is_national(title: str) -> bool:
    """대표팀 경기 기사. '[AG] …' 말머리나 아시안게임·대표팀 등 (제목 속 'AG 이후' 같은 언급은 유지)."""
    m = re.match(r"\s*\[([^\]]+)\]", title)
    return bool(m and NATIONAL_RE.search(m.group(1))) or NATIONAL_STRONG_RE.search(title) is not None


def load_team_players(pitchers: dict[str, set[str]]) -> dict[str, set[str]]:
    """팀별 선수 이름 (kboPlayers.json 등록 선수 + 최근 투수). 팀명 없는 제목의 관련성 판단용."""
    players = {t: set(pitchers.get(t, ())) for t in TEAMS}
    path = DATA / "kboPlayers.json"
    if path.exists():
        for p in json.loads(path.read_text(encoding="utf-8")):
            name = (p.get("playerName") or "").strip()
            if p.get("teamName") in players and len(name) >= 2:
                players[p["teamName"]].add(name)
    return players


def dedupe_key(title: str) -> str:
    return re.sub(r"\W", "", title)[:40]


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


def collect(days: int, per_team: int, news_per_team: int = 15) -> dict:
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
                key = dedupe_key(title)
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
    players = load_team_players(pitchers)
    unique = unique_player_teams(players)
    news = {team: collect_team_news(team, days, news_per_team, players[team], unique) for team in TEAMS}
    return {
        "updatedAt": datetime.now(KST).isoformat(timespec="seconds"),
        "source": "Google News RSS (주요 언론사만)",
        "teams": teams,
        "news": news,
    }


def collect_team_news(
    team: str, days: int, limit: int, players: set[str], unique_players: dict[str, str]
) -> list[dict]:
    """팀 이름으로 검색한 최신 기사 중 제목에 그 팀이나 소속 선수가 나오는 것.
    제목에 나온 팀들을 teams로 붙여 앱이 맞대결 기사를 골라낼 수 있게 한다."""
    since = datetime.now(KST) - timedelta(days=days)
    seen: set[str] = set()
    rows: list[dict] = []
    for item in fetch_rss(f"{FULL_NAMES[team]} when:{days}d"):
        title = item["title"]
        key = dedupe_key(title)
        if key in seen or not is_trusted(item["source"]):
            continue
        if any(w in title for w in SKIP_WORDS) or is_national(title):
            continue
        if datetime.fromisoformat(item["publishedAt"]) < since:
            continue
        tagged = teams_in(title, unique_players)
        if team not in tagged and not any(mentions(title, n) for n in players):
            continue
        seen.add(key)
        rows.append({**item, "teams": [team] + [t for t in tagged if t != team]})
    time.sleep(0.5)
    rows.sort(key=lambda r: r["publishedAt"], reverse=True)
    print(f"🗞️ {team}: 팀 기사 {len(rows)}건 중 {min(len(rows), limit)}건")
    return rows[:limit]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--days", type=int, default=4)
    parser.add_argument("--per-team", type=int, default=8)
    parser.add_argument("--news-per-team", type=int, default=15, help="general team headlines to keep")
    parser.add_argument("--out", default=str(OUT))
    args = parser.parse_args()
    result = collect(args.days, args.per_team, args.news_per_team)
    if not any(result["teams"].values()) and not any(result["news"].values()):
        print("⚠️ 기사를 하나도 못 가져와 기존 파일을 유지합니다")
        return 0
    out = Path(args.out)
    if out.exists():
        old = json.loads(out.read_text(encoding="utf-8"))
        if old.get("teams") == result["teams"] and old.get("news") == result["news"]:
            print("⏸️ 변경 없음")
            return 0
    out.write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"💾 {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
