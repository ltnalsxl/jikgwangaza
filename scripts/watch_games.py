"""경기일 저녁 동안 결과/순위를 몇 분 간격으로 갱신하고 바로 배포한다.

GitHub cron은 수십 분~수 시간씩 밀리기 때문에, 한 번 시작된 잡 안에서 직접
반복한다. 오늘 경기가 모두 끝나거나(종료/취소) 마감 시간이 되면 멈춘다.

    python scripts/watch_games.py            # CI: 반복 + 커밋/푸시 + 배포 요청
    python scripts/watch_games.py --once --dry-run   # 로컬: 한 번만 수집, 커밋 안 함
"""

import argparse
import glob
import json
import os
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "public", "data", "kbo_crawler_data")
FINAL_STATUSES = {"종료", "경기취소", "취소", "서스펜디드"}
# 경기 시작 후 이 시간 전에는 끝날 일이 거의 없어서 천천히 확인한다.
LIKELY_END_AFTER = timedelta(hours=2, minutes=20)
FAST_INTERVAL = 3 * 60
SLOW_INTERVAL = 12 * 60
# 마지막 경기가 끝난 뒤에도 네이버 순위 API는 몇 분 늦게 바뀌므로 몇 번 더 확인한다.
AFTER_DONE_PASSES = 3


def log(msg):
    print(f"[{datetime.now(KST):%H:%M:%S}] {msg}", flush=True)


def run(cmd, check=True, env=None):
    log("$ " + " ".join(cmd))
    return subprocess.run(cmd, cwd=ROOT, check=check, env=env)


def games_on(day, data_dir=DATA_DIR):
    games = []
    for path in sorted(glob.glob(os.path.join(data_dir, f"{day}_*.json"))):
        try:
            with open(path, encoding="utf-8") as f:
                games.append(json.load(f))
        except (OSError, ValueError):
            continue
    return games


def start_time(game, day):
    raw = (game.get("game_time") or "").replace("경기 시간", "").strip()
    try:
        hh, mm = (int(x) for x in raw.split(":")[:2])
    except ValueError:
        hh, mm = 18, 30
    return datetime.fromisoformat(day).replace(hour=hh, minute=mm, tzinfo=KST)


def day_state(games, day, now):
    """('none'|'done'|'live', 다음 확인까지 기다릴 초)."""
    if not games:
        return "none", 0
    open_games = [g for g in games if (g.get("game_status") or "") not in FINAL_STATUSES]
    if not open_games:
        return "done", 0
    likely_end = min(start_time(g, day) for g in open_games) + LIKELY_END_AFTER
    if now >= likely_end:
        return "live", FAST_INTERVAL
    return "live", max(FAST_INTERVAL, min(SLOW_INTERVAL, int((likely_end - now).total_seconds())))


def crawl(today, tomorrow):
    for attempt in range(3):
        result = run(
            [sys.executable, "public/kbo_crawler.py", "--mode", "range",
             "--start-date", today, "--end-date", tomorrow,
             "--save_dir", "public/data/kbo_crawler_data", "--no-selenium"],
            check=False,
        )
        if result.returncode == 0:
            return True
        log(f"crawl failed (attempt {attempt + 1}), retrying")
        time.sleep(20)
    return False


def publish():
    fd, out = tempfile.mkstemp()
    os.close(fd)
    try:
        env = dict(os.environ, GITHUB_OUTPUT=out)
        result = run(["scripts/ci/commit-and-push.sh", "Update live game results & ranks",
                      "public/data/kbo_crawler_data", "public/data/teamRank.json"], check=False, env=env)
        if result.returncode != 0:
            # 다른 워크플로와 충돌하면 이번 수집은 버리고 최신 main에서 다음 회차를 다시 수집한다.
            log("push failed; resetting to origin/main")
            run(["git", "fetch", "-q", "origin", "main"], check=False)
            run(["git", "reset", "-q", "--hard", "origin/main"], check=False)
            return False
        with open(out, encoding="utf-8") as f:
            changed = "changed=true" in f.read()
    finally:
        os.remove(out)
    if changed:
        # deploy.yml은 concurrency 그룹이 있어서, 여러 번 요청해도 최신 main 하나만 대기열에 남는다.
        run(["gh", "workflow", "run", "deploy.yml", "--ref", "main"], check=False)
    return changed


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true", help="한 번만 수집하고 끝낸다")
    parser.add_argument("--dry-run", action="store_true", help="커밋/푸시/배포하지 않는다")
    parser.add_argument("--max-minutes", type=int, default=330)
    parser.add_argument("--chain", action="store_true",
                        help="마감 시간까지 경기가 안 끝나면 game-watch.yml을 다시 실행해 이어간다")
    args = parser.parse_args(argv)

    deadline = datetime.now(KST) + timedelta(minutes=args.max_minutes)
    after_done = 0
    seen_live = False
    while True:
        now = datetime.now(KST)
        today = now.date().isoformat()
        tomorrow = (now.date() + timedelta(days=1)).isoformat()

        crawled = crawl(today, tomorrow)
        run(["node", "scripts/generateLineupIndex.js"])
        run([sys.executable, "public/kbo_team_rank_crawler.py"], check=False)
        if not args.dry_run:
            publish()

        state, wait = day_state(games_on(today), today, datetime.now(KST))
        log(f"today={today} state={state} crawled={crawled}")
        if state == "live":
            seen_live = True
        elif state == "done" and seen_live and after_done < AFTER_DONE_PASSES:
            after_done += 1
            state, wait = "live", FAST_INTERVAL
        if args.once or state != "live":
            return 0
        if datetime.now(KST) + timedelta(seconds=wait) > deadline:
            log("deadline reached")
            if args.chain and not args.dry_run:
                run(["gh", "workflow", "run", "game-watch.yml", "--ref", "main"], check=False)
            return 0
        log(f"sleeping {wait // 60}m {wait % 60}s")
        time.sleep(wait)


if __name__ == "__main__":
    sys.exit(main())
