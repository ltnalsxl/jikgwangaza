#!/usr/bin/env python3
"""선수 응원가(playerSongs.json)를 현재 로스터와 동기화한다.

하는 일
1. 기존 응원가에 playerId를 붙인다(같은 팀·같은 이름이 한 명일 때만).
2. 이적한 선수를 찾는다. 예전 팀 응원가는 그대로 두고(프론트는 현재 팀 응원가만 매칭),
   새 팀 응원가를 YouTube에서 찾는다.
3. 이번 시즌 선발 라인업에 자주 나오는데 응원가가 없는 타자도 찾는다.
4. 등록된 YouTube 영상이 삭제되거나 임베드가 막혔는지 oEmbed로 확인한다(--check-links).
5. 점수가 높은 검색 결과만 자동 반영(source=youtube-auto, verified=false)하고,
   애매한 후보는 리포트(마크다운)로 남긴다.

YOUTUBE_API_KEY 환경변수가 있으면 Data API를, 없으면 검색 결과 페이지(ytInitialData)를 사용한다.
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import requests

KST = ZoneInfo("Asia/Seoul")
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SONGS_PATH = os.path.join(ROOT, "public", "data", "playerSongs.json")
PLAYERS_PATH = os.path.join(ROOT, "public", "data", "kboPlayers.json")
LINEUP_DIR = os.path.join(ROOT, "public", "data", "kbo_crawler_data")
STATE_PATH = os.path.join(ROOT, "scripts", "data", "songSearchState.json")

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

TEAM_ALIASES = {
    "KIA": ["KIA", "기아", "타이거즈", "TIGERS"],
    "삼성": ["삼성", "라이온즈", "LIONS"],
    "LG": ["LG", "트윈스", "TWINS", "엘지"],
    "두산": ["두산", "베어스", "BEARS"],
    "KT": ["KT", "위즈", "WIZ", "케이티"],
    "SSG": ["SSG", "랜더스", "LANDERS"],
    "롯데": ["롯데", "자이언츠", "GIANTS"],
    "한화": ["한화", "이글스", "EAGLES"],
    "NC": ["NC", "다이노스", "DINOS", "엔씨"],
    "키움": ["키움", "히어로즈", "HEROES"],
}
TEAM_FULL = {
    "KIA": "KIA 타이거즈", "삼성": "삼성 라이온즈", "LG": "LG 트윈스", "두산": "두산 베어스",
    "KT": "KT 위즈", "SSG": "SSG 랜더스", "롯데": "롯데 자이언츠", "한화": "한화 이글스",
    "NC": "NC 다이노스", "키움": "키움 히어로즈",
}
TRUSTED_CHANNELS = [
    "야쏭", "YASSONG", "타이거즈", "TIGERS", "LIONS", "라이온즈", "TWINS", "트윈스", "베어스",
    "BEARS", "WIZ", "위즈", "LANDERS", "랜더스", "GIANTS", "자이언츠", "이글스", "EAGLES",
    "다이노스", "엔튜브", "DINOS", "HEROES", "히어로즈",
]
NEGATIVE_WORDS = [
    "AI", "플레이리스트", "PLAYLIST", "모음", "메들리", "직캠", "치어리더", "커버", "COVER",
    "반응", "리액션", "등장곡", "교가", "노래방", "SHORTS", "하이라이트", "팬메이드", "제안",
    "예상", "반복", "트로트", "현장", "브이로그", "VLOG", "키 다운", "전광판", "비공식", "합성",
]
AUTO_APPLY_SCORE = 8
REPORT_SCORE = 4


def now_kst():
    return datetime.now(KST)


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def name_in(text, name):
    return re.search(rf"(?<![가-힣]){re.escape(name)}(?![가-힣])", text) is not None


def teams_in(text):
    upper = text.upper()
    found = set()
    for team, aliases in TEAM_ALIASES.items():
        for alias in aliases:
            a = alias.upper()
            hit = (re.search(rf"(?<![A-Z]){re.escape(a)}(?![A-Z])", upper) if a.isascii() else a in upper)
            if hit:
                found.add(team)
                break
    return found


def score_video(video, name, team, moved=False):
    """검색 결과 한 건에 점수를 매긴다. 이름/응원가가 없으면 None."""
    title = video.get("title", "")
    channel = video.get("channel", "")
    upper_title = title.upper()
    if not name_in(title, name) or "응원가" not in title:
        return None
    score = 3  # 이름 + 응원가
    title_teams = teams_in(title)
    channel_teams = teams_in(channel)
    if team in title_teams:
        score += 3
    elif team in channel_teams:
        score += 2
    others = (title_teams | channel_teams) - {team}
    if others and team not in (title_teams | channel_teams):
        return None
    if others:
        score -= 2
    if any(ch.upper() in channel.upper() for ch in TRUSTED_CHANNELS):
        score += 2
    if "MUSIC VIDEO" in upper_title or re.search(r"\bMV\b", upper_title) or "신규" in title:
        score += 1
    if any(
        re.search(rf"(?<![A-Z]){re.escape(word)}(?![A-Z])", upper_title) if word.isascii() else word in upper_title
        for word in NEGATIVE_WORDS
    ):
        score -= 3
    published = video.get("published", "")
    years = re.search(r"(\d+)\s*년 전", published)
    if years and int(years.group(1)) >= (2 if moved else 3):
        score -= 2  # 이적 전이거나 예전 응원가일 가능성
    if "," in title or "&" in title:
        score -= 2  # 여러 선수를 묶은 영상
    return score


class YouTubeClient:
    def __init__(self, api_key=None):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9"})
        self.session.cookies.set("CONSENT", "YES+1", domain=".youtube.com")

    def search(self, query, limit=10):
        if self.api_key:
            return self._search_api(query, limit)
        return self._search_html(query, limit)

    def _search_api(self, query, limit):
        resp = self.session.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet", "q": query, "type": "video", "maxResults": limit,
                "regionCode": "KR", "relevanceLanguage": "ko", "key": self.api_key,
            },
            timeout=15,
        )
        resp.raise_for_status()
        out = []
        for item in resp.json().get("items", []):
            vid = item.get("id", {}).get("videoId")
            sn = item.get("snippet", {})
            if vid:
                out.append({
                    "id": vid, "title": sn.get("title", ""), "channel": sn.get("channelTitle", ""),
                    "published": sn.get("publishedAt", ""),
                })
        return out

    def _search_html(self, query, limit):
        resp = self.session.get(
            "https://www.youtube.com/results",
            params={"search_query": query, "hl": "ko", "gl": "KR"},
            timeout=15,
        )
        resp.raise_for_status()
        m = re.search(r"var ytInitialData = (\{.*?\});</script>", resp.text, re.S)
        if not m:
            raise RuntimeError("ytInitialData not found (YouTube layout changed or blocked)")
        data = json.loads(m.group(1))
        out = []

        def walk(node):
            if len(out) >= limit:
                return
            if isinstance(node, dict):
                vr = node.get("videoRenderer")
                if vr and vr.get("videoId"):
                    out.append({
                        "id": vr["videoId"],
                        "title": "".join(r.get("text", "") for r in vr.get("title", {}).get("runs", [])),
                        "channel": "".join(r.get("text", "") for r in vr.get("ownerText", {}).get("runs", [])),
                        "published": vr.get("publishedTimeText", {}).get("simpleText", ""),
                    })
                    return
                for v in node.values():
                    walk(v)
            elif isinstance(node, list):
                for v in node:
                    walk(v)

        walk(data)
        return out

    def link_status(self, video_id):
        """'ok' | 'broken' | 'unknown'. oEmbed는 삭제/비공개/임베드 금지 영상에 401/404를 준다."""
        try:
            resp = self.session.get(
                "https://www.youtube.com/oembed",
                params={"url": f"https://www.youtube.com/watch?v={video_id}", "format": "json"},
                timeout=10,
            )
        except requests.RequestException:
            return "unknown"
        if resp.status_code == 200:
            return "ok"
        if resp.status_code in (400, 401, 403, 404):
            return "broken"
        return "unknown"


def recent_lineup_counts(season):
    """이번 시즌 선발 타자로 나온 횟수 {playerId: count}."""
    bundle = load_json(os.path.join(LINEUP_DIR, f"season-{season}.json"), [])
    counts = {}
    for game in bundle:
        for side in (game.get("starting_lineups") or {}).values():
            for b in (side or {}).get("starting_batters") or []:
                pid = str(b.get("player_id") or "")
                if pid:
                    counts[pid] = counts.get(pid, 0) + 1
    return counts


def analyze(songs, players):
    by_name = {}
    for p in players:
        by_name.setdefault(p["playerName"], []).append(p)

    attached = 0
    moved = []  # (song, player)
    for song in songs:
        name = song.get("playerName")
        team = song.get("team")
        if not name or not team:
            continue
        same_team = [p for p in by_name.get(name, []) if p["teamName"] == team]
        if len(same_team) == 1:
            pid = str(same_team[0].get("playerId") or "")
            if pid and song.get("playerId") != pid:
                song["playerId"] = pid
                attached += 1
            continue
        if same_team:
            continue
        candidates = by_name.get(name, [])
        if len(candidates) == 1:
            moved.append((song, candidates[0]))
    return attached, moved


def has_current_song(songs, player, song_type="응원가"):
    pid = str(player.get("playerId") or "")
    for s in songs:
        if s.get("team") != player["teamName"] or s.get("unavailable"):
            continue
        if (s.get("type") or "응원가") != song_type:
            continue
        if s.get("playerId") == pid or (not s.get("playerId") and s.get("playerName") == player["playerName"]):
            return True
    return False


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--max-searches", type=int, default=40)
    parser.add_argument("--min-starts", type=int, default=15, help="응원가 없는 타자 검색 기준(시즌 선발 출전 수)")
    parser.add_argument("--recheck-days", type=int, default=7, help="같은 선수를 다시 검색하기까지 기다릴 일수")
    parser.add_argument("--check-links", action="store_true", help="등록된 YouTube 링크가 살아있는지 확인")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--report", default=os.environ.get("GITHUB_STEP_SUMMARY"))
    args = parser.parse_args()

    songs = load_json(SONGS_PATH, None)
    players = load_json(PLAYERS_PATH, None)
    if not isinstance(songs, list) or not isinstance(players, list) or len(players) < 400:
        print("❌ playerSongs.json / kboPlayers.json을 읽지 못했거나 로스터가 비정상입니다.")
        return 1
    state = load_json(STATE_PATH, {})
    yt = YouTubeClient(os.environ.get("YOUTUBE_API_KEY"))
    today = now_kst().date()
    lines = [f"# 응원가 동기화 리포트 ({now_kst():%Y-%m-%d %H:%M} KST)", ""]

    attached, moved = analyze(songs, players)
    print(f"🔗 playerId 연결: {attached}건, 이적 감지: {len(moved)}건")

    broken = []
    if args.check_links:
        for s in songs:
            vid = s.get("youtubeId")
            if not vid:
                continue
            status = yt.link_status(vid)
            if status == "broken" and not s.get("unavailable"):
                s["unavailable"] = True
                broken.append(s)
            elif status == "ok" and s.get("unavailable"):
                s.pop("unavailable", None)
            time.sleep(0.2)
        print(f"🔍 깨진 링크: {len(broken)}건")

    # 검색 대상: 이적 선수 > 깨진 링크 > 응원가 없는 주전 타자
    targets = []
    seen = set()

    def add_target(player, reason, moved_flag=False, song_type="응원가", replace=None):
        key = (str(player.get("playerId")), song_type)
        if key in seen or has_current_song(songs, player, song_type):
            return
        seen.add(key)
        targets.append({
            "player": player, "reason": reason, "moved": moved_flag, "type": song_type, "replace": replace,
        })

    for song, player in moved:
        stype = song.get("type") or "응원가"
        if stype.startswith("응원가"):
            add_target(player, f"이적 ({song['team']} → {player['teamName']})", True)
    by_key = {(p["playerName"], p["teamName"]): p for p in players}
    for s in broken:
        p = by_key.get((s.get("playerName"), s.get("team")))
        if p and (s.get("type") or "응원가").startswith("응원가"):
            add_target(p, "기존 영상 삭제/임베드 불가", song_type=s.get("type") or "응원가", replace=s)
    counts = recent_lineup_counts(today.year)
    by_id = {str(p.get("playerId")): p for p in players}
    for pid, n in sorted(counts.items(), key=lambda kv: -kv[1]):
        if n < args.min_starts or pid not in by_id:
            continue
        add_target(by_id[pid], f"시즌 선발 {n}경기, 응원가 없음")

    applied, pending, searched = [], [], 0
    for t in targets:
        p = t["player"]
        pid = str(p.get("playerId"))
        entry = state.get(pid, {})
        wait = 2 if t["moved"] else args.recheck_days
        last = entry.get("lastSearched")
        if last and (today - datetime.strptime(last, "%Y-%m-%d").date()) < timedelta(days=wait):
            if entry.get("best"):
                pending.append((t, entry["best"], entry.get("bestScore")))
            continue
        if searched >= args.max_searches:
            break
        searched += 1
        query = f"{TEAM_FULL.get(p['teamName'], p['teamName'])} {p['playerName']} 응원가"
        try:
            results = yt.search(query)
        except Exception as exc:  # noqa: BLE001
            print(f"⚠️ 검색 실패 {query}: {exc}")
            if searched <= 2:
                continue
            break
        scored = []
        for v in results:
            sc = score_video(v, p["playerName"], p["teamName"], t["moved"])
            if sc is not None:
                scored.append((sc, v))
        scored.sort(key=lambda x: -x[0])
        best = None
        for sc, v in scored:
            if sc < REPORT_SCORE:
                break
            if yt.link_status(v["id"]) == "broken":
                continue
            best = (sc, v)
            break
        state[pid] = {
            "name": p["playerName"], "team": p["teamName"], "lastSearched": today.isoformat(),
            "best": best[1] if best else None, "bestScore": best[0] if best else None,
        }
        if best and best[0] >= AUTO_APPLY_SCORE and t["replace"] is not None:
            old = t["replace"]
            old["previousYoutubeId"] = old.get("youtubeId", "")
            old["youtubeId"] = best[1]["id"]
            old["playerId"] = pid
            old["source"] = "youtube-auto"
            old["verified"] = False
            old["addedAt"] = today.isoformat()
            old["videoTitle"] = best[1]["title"]
            old.pop("unavailable", None)
            applied.append((t, best[1], best[0]))
            print(f"♻️ {p['teamName']} {p['playerName']}: 영상 교체 → {best[1]['title']} ({best[0]}점)")
        elif best and best[0] >= AUTO_APPLY_SCORE:
            songs.append({
                "playerName": p["playerName"],
                "team": p["teamName"],
                "type": t["type"],
                "chantTitle": f"{p['playerName']} 응원가",
                "youtubeId": best[1]["id"],
                "lyrics": "",
                "playerId": pid,
                "source": "youtube-auto",
                "verified": False,
                "addedAt": today.isoformat(),
                "videoTitle": best[1]["title"],
            })
            applied.append((t, best[1], best[0]))
            print(f"✅ {p['teamName']} {p['playerName']}: {best[1]['title']} ({best[0]}점)")
        elif best:
            pending.append((t, best[1], best[0]))
            print(f"🤔 {p['teamName']} {p['playerName']}: 후보 {best[1]['title']} ({best[0]}점)")
        else:
            print(f"➖ {p['teamName']} {p['playerName']}: 적합한 영상 없음")
        time.sleep(1.5)

    def fmt(t, v, sc):
        p = t["player"]
        return (f"| {p['teamName']} | {p['playerName']} | {t['reason']} | "
                f"[{v['title']}](https://youtu.be/{v['id']}) | {v.get('channel', '')} | {sc} |")

    header = "| 팀 | 선수 | 사유 | 영상 | 채널 | 점수 |\n|---|---|---|---|---|---|"
    lines += [f"- 이적 감지 {len(moved)}명, 검색 {searched}회, 자동 반영 {len(applied)}건, 확인 필요 {len(pending)}건", ""]
    if applied:
        lines += ["## 자동 반영 (verified=false)", header] + [fmt(*a) for a in applied] + [""]
    if pending:
        lines += ["## 확인 필요 (점수 미달, 직접 확인 후 playerSongs.json에 추가)", header]
        lines += [fmt(*x) for x in pending] + [""]
    if broken:
        lines += ["## 삭제/임베드 불가 영상 (unavailable 처리)"]
        lines += [f"- {s.get('team')} {s.get('playerName')} {s.get('type')}: {s.get('youtubeId')}" for s in broken]
        lines.append("")
    missing = [t for t in targets if not has_current_song(songs, t["player"], t["type"])]
    if missing:
        lines += ["## 아직 응원가가 없는 선수"]
        lines += [f"- {t['player']['teamName']} {t['player']['playerName']} ({t['reason']})" for t in missing]
    report = "\n".join(lines) + "\n"

    if args.report:
        with open(args.report, "a", encoding="utf-8") as f:
            f.write(report)
    else:
        print(report)

    if not args.dry_run:
        write_json(SONGS_PATH, songs)
        write_json(STATE_PATH, dict(sorted(state.items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
