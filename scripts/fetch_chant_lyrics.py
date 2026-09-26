#!/usr/bin/env python3
"""Fill empty chant lyrics in public/data/playerSongs.json from namu.wiki.

Source page per team: https://namu.wiki/w/{팀 풀네임}/응원가/선수
Each player has a heading like "2.15. 하주석 (No. 30)" followed by one or more
<table> blocks holding lyrics. We pick the first table that mentions the player.

Only entries with empty lyrics are touched; curated lyrics are never overwritten.
namu.wiki content is CC BY-NC-SA 2.0 KR, so filled entries get lyricsSource.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
SONGS_PATH = ROOT / "public" / "data" / "playerSongs.json"

TEAM_FULL = {
    "KIA": "KIA 타이거즈", "삼성": "삼성 라이온즈", "LG": "LG 트윈스", "두산": "두산 베어스",
    "KT": "KT 위즈", "SSG": "SSG 랜더스", "롯데": "롯데 자이언츠", "한화": "한화 이글스",
    "NC": "NC 다이노스", "키움": "키움 히어로즈",
}
# namu.wiki document titles differ from display names for a few teams.
PAGE_TITLE = {**TEAM_FULL, "KT": "kt wiz"}
TEAM_LABELS = set(TEAM_FULL.values()) | set(TEAM_FULL.keys()) | {"kt wiz"}
META_LINE_RE = re.compile(r"^(.{0,12}구단\s*자작곡.{0,12}|자작곡|원곡\s*[:：].*|No\.?\s*\d+|\d{4}\s*~\s*(\d{4})?)$", re.I)
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
HEADINGS = ["h2", "h3", "h4", "h5", "h6"]
FOOTNOTE_RE = re.compile(r"\[\d+\]|\[[a-zA-Z]\]|\[편집\]|\[무앰프\]")
NUMBER_RE = re.compile(r"^(\d+(?:\.\d+)*)\.\s*(.*)$")
LYRICS_SOURCE = "namu.wiki"


def page_url(team: str) -> str:
    return f"https://namu.wiki/w/{quote(PAGE_TITLE[team] + '/응원가/선수')}"


def fetch_page(team: str, session: requests.Session) -> BeautifulSoup | None:
    try:
        resp = session.get(page_url(team), timeout=20)
    except requests.RequestException as exc:
        print(f"⚠️ {team}: 요청 실패 {exc}")
        return None
    if resp.status_code != 200:
        print(f"⚠️ {team}: HTTP {resp.status_code}")
        return None
    return BeautifulSoup(resp.text, "html.parser")


def squash(text: str) -> str:
    return re.sub(r"[\s!~.,·\-()]", "", text)


BLOCK_TAGS = ("table", "blockquote")
LINE_BREAK_TAGS = {"br", "div", "p", "li", "tr"}
CREDIT_LINE_RE = re.compile(r"\s-\s|^-\s")


def block_text(block) -> str:
    """Text of a lyrics block, keeping inline spans on one line."""
    parts: list[str] = []
    for el in block.descendants:
        if isinstance(el, str):
            parts.append(str(el))
        elif el.name in LINE_BREAK_TAGS:
            parts.append("\n")
    return "".join(parts)


def clean_block_text(block, name: str) -> str:
    lines = []
    for raw in block_text(block).split("\n"):
        line = re.sub(r"\s+", " ", FOOTNOTE_RE.sub("", raw)).strip()
        if not line or META_LINE_RE.match(line):
            continue
        if line.startswith("등장곡") or line.startswith("등장시"):
            break
        if CREDIT_LINE_RE.search(line) and squash(name) not in squash(line):
            continue  # "김원준 - Show" style original-song credit
        lines.append(line)
    header_re = re.compile(rf"^(No\.?\s*\d+\s*)?{re.escape(name)}$")
    while lines and (lines[0] in TEAM_LABELS or header_re.match(lines[0])):
        lines.pop(0)
    return "\n".join(lines).strip()


def heading_matches(title: str, name: str) -> bool:
    # "2.15. 하주석 (No. 30)", "2.8. No.9 박계범", "2.14. No.34 샘 힐리어드"
    m = NUMBER_RE.match(title)
    if not m:
        return False
    rest = re.sub(r"^No\.?\s*\d+\s*", "", m.group(2))
    label = re.split(r"[(\[]", rest, maxsplit=1)[0].strip()
    return label == name or label.endswith(" " + name)


def section_blocks(heading, number: str):
    """Yield (label_text, block) for lyric blocks in a heading's section."""
    label: list[str] = []
    skip_until = None
    for el in heading.next_elements:
        if skip_until is not None:
            if el is skip_until:
                skip_until = None
            continue
        tag = getattr(el, "name", None)
        if tag in HEADINGS:
            sub = NUMBER_RE.match(el.get_text(" ", strip=True))
            if sub and sub.group(1).startswith(number + "."):
                continue  # nested "응원가 1" style sub-section
            return
        if tag in BLOCK_TAGS:
            yield " ".join(label), el
            label = []
            # skip the block's descendants
            nxt = el
            while nxt is not None and nxt.next_sibling is None:
                nxt = nxt.parent
            skip_until = nxt.next_sibling if nxt is not None else None
            if skip_until is None:
                return
        elif isinstance(el, str) and el.strip():
            label.append(el.strip())


def find_player_lyrics(soup: BeautifulSoup, name: str) -> str | None:
    target = squash(name)
    for heading in soup.find_all(HEADINGS):
        title = heading.get_text(" ", strip=True)
        if not heading_matches(title, name):
            continue
        number = NUMBER_RE.match(title).group(1)
        fallback = None
        for label, block in section_blocks(heading, number):
            text = clean_block_text(block, name)
            if not text or target not in squash(text):
                continue
            if "등장" in label and "응원" not in label and "타격" not in label:
                fallback = fallback or text
                continue
            return text
        if fallback:
            return fallback
    return None


def load_songs() -> list[dict]:
    return json.loads(SONGS_PATH.read_text(encoding="utf-8"))


def save_songs(songs: list[dict]) -> None:
    SONGS_PATH.write_text(json.dumps(songs, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--team", action="append", help="limit to team(s)")
    parser.add_argument("--delay", type=float, default=2.0, help="seconds between page requests")
    args = parser.parse_args()

    songs = load_songs()
    targets = [
        s for s in songs
        if not str(s.get("lyrics") or "").strip()
        and s.get("team") in TEAM_FULL
        and (not args.team or s["team"] in args.team)
    ]
    if not targets:
        print("✅ 가사가 비어 있는 응원가 없음")
        return 0

    session = requests.Session()
    session.headers.update({"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9"})

    filled, missing = [], []
    pages: dict[str, BeautifulSoup | None] = {}
    for song in targets:
        team = song["team"]
        if team not in pages:
            if pages:
                time.sleep(args.delay)
            pages[team] = fetch_page(team, session)
        soup = pages[team]
        lyrics = find_player_lyrics(soup, song["playerName"]) if soup else None
        if lyrics:
            song["lyrics"] = lyrics
            song["lyricsSource"] = LYRICS_SOURCE
            filled.append(song)
        else:
            missing.append(song)

    for s in filled:
        first = s["lyrics"].split("\n")[0]
        print(f"🎵 {s['team']} {s['playerName']}: {first[:40]}")
    for s in missing:
        print(f"… {s['team']} {s['playerName']}: 나무위키에서 못 찾음")
    print(f"가사 채움 {len(filled)} / 대상 {len(targets)}")

    if filled and not args.dry_run:
        save_songs(songs)
    return 0


if __name__ == "__main__":
    sys.exit(main())
