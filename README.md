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

Two GitHub Actions workflows keep the data updated:

- `.github/workflows/lineup-crawl.yml` fetches new lineups several times each day and rebuilds `public/data/kbo_crawler_data/index.json`.
- `.github/workflows/player-crawl.yml` updates `public/data/kboPlayers.json` daily at 00:00 UTC.

Both workflows commit any changes back to the repository automatically.

Any push to the `main` branch – including updates from these workflows –
automatically triggers `.github/workflows/deploy.yml` to build the app and
deploy it to Firebase.

## Basic npm commands

```bash
npm install   # install dependencies
npm start     # start development server
npm test      # run unit tests
npm run build # build for production
```

Running these commands requires **Node.js 20 or later**.

## Handling multiple songs per player

Some players have more than one walk‑up song. When the app opens a player
profile (for example by clicking a player card), it simply uses the **first**
matching song in `playerSongs`. This means that duplicates are supported but the
UI always plays the first entry it finds. No uniqueness is assumed in the code
path – additional songs can be added as separate records in
`public/data/playerSongs.json`.

## Sharing lineups

Use the "오늘의 라인업 공유하기" button in the lineup tab to share or copy the current team's lineup.

© 2025 Jikgwangaza. All rights reserved.
Created and maintained by Sumin Lee.
