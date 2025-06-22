# JikgwanGaja

JikgwanGaja is a React application for browsing KBO lineups, player walk-up songs and team chants. All information is stored as JSON under `public/data` so the app can run entirely offline.

## Updating JSON data

Edit the JSON files directly inside `public/data/` or generate new lineup files using the crawler described below. The crawler automatically rebuilds `public/data/kbo_crawler_data/index.json` when it finishes, but you can run the indexing script manually:

```bash
npm run build-lineup-index
```

## Crawling lineups

The crawler script `public/kbo_crawler.py` fetches lineups from Naver Sports. It requires Python along with `requests`, `beautifulsoup4`, `pandas` and `selenium`, and a local Chrome/Chromedriver installation.

Run a **full** crawl to download every game from the 2025 season onward:

```bash
python public/kbo_crawler.py --mode full --save_dir public/data/kbo_crawler_data
```

For an **incremental** update of the last N days (3 by default):

```bash
python public/kbo_crawler.py --mode incremental --days 3 --save_dir public/data/kbo_crawler_data
```


The crawler saves each game's lineup JSON files and then rebuilds the index automatically.

## Crawling player info

`public/kbo_players_crawler.py` scrapes basic player details from the KBO web site.
It starts at [https://www.koreabaseball.com/Player/Search.aspx](https://www.koreabaseball.com/Player/Search.aspx)
and iterates through each team. The script requires Selenium with Chrome and writes
the results to `public/data/kboPlayers.json`.
The crawler records each player's school instead of the `updatedAt` timestamp found in
older data files.

Run the crawler:

```bash
python public/kbo_players_crawler.py
```

## Automated daily crawl

The GitHub Actions workflow at `.github/workflows/daily-crawl.yml` runs every
day to fetch new lineups **and** the full player list. The workflow rebuilds
`public/data/kbo_crawler_data/index.json` and updates
`public/data/kboPlayers.json`, committing any changes back to the repository
automatically.

## Basic npm commands

```bash
npm install   # install dependencies
npm start     # start development server
npm test      # run unit tests
npm run build # build for production
```

Running these commands requires **Node.js 20 or later**.

## Sharing lineups

Use the "오늘의 라인업 공유하기" button in the lineup tab to share or copy the current team's lineup.
