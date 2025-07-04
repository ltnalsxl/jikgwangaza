import os
import json
from datetime import datetime, timedelta
import argparse

from kbo_crawler import NaverKBOAllLineupCrawler


def fetch_schedule(start_date: str, end_date: str) -> list:
    """Fetch schedule data between the given dates inclusive."""
    results = []
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    current = start

    while current <= end:
        date_str = current.strftime("%Y-%m-%d")
        crawler = NaverKBOAllLineupCrawler()  # Create a new driver per day
        try:
            games = crawler.get_daily_games(date_str)
            results.extend(games)
        finally:
            crawler.close()
        current += timedelta(days=1)

    return results


def save_schedule(schedule: list, path: str = "public/data/kboSchedule.json") -> None:
    """Save schedule list to JSON with a crawl timestamp."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = {
        "crawl_time": datetime.now().isoformat(),
        "results": schedule,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main() -> None:
    parser = argparse.ArgumentParser(description="KBO schedule crawler")
    parser.add_argument("--start", type=str, required=False,
                        default=datetime.now().strftime("%Y-%m-%d"),
                        help="Start date YYYY-MM-DD")
    parser.add_argument("--end", type=str, required=False,
                        default=datetime.now().strftime("%Y-%m-%d"),
                        help="End date YYYY-MM-DD")
    parser.add_argument("--output", type=str,
                        default="public/data/kboSchedule.json",
                        help="Output JSON path")
    args = parser.parse_args()

    schedule = fetch_schedule(args.start, args.end)
    save_schedule(schedule, args.output)
    print(f"Saved {len(schedule)} games to {args.output}")


if __name__ == "__main__":
    main()
