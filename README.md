# JikgwanGaja

JikgwanGaja is a React application for browsing KBO lineups, player walk-up songs and team chants. All information is stored as JSON under `public/data` so the app can run entirely offline.

## Updating JSON data

Edit the JSON files directly inside `public/data/` or generate new lineup files using the crawler described below. After adding lineup files inside `public/data/kbo_crawler_data`, run:

```bash
npm run build-lineup-index
```

to refresh `public/data/kbo_crawler_data/index.json`.

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

After crawling, run `npm run build-lineup-index` to update the game index.

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
