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

## Crawling team rankings

`public/kbo_team_rank_crawler.py` collects the daily league standings and
writes them to `public/data/teamRank.json`.

Run it manually:

```bash
python public/kbo_team_rank_crawler.py --output public/data/teamRank.json
```

This output file is overwritten each run so historical rankings are **not**
accumulated. Use version control if you wish to keep old snapshots.

The crawler also runs automatically each day via GitHub Actions.

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

## Generating English player names

`scripts/generatePlayersEnglish.js` converts the Korean names in
`public/data/kboPlayers.json` to a romanized version. The output is written to
`public/data/kboPlayersEn.json`.

Run it after updating the Korean data:

```bash
node scripts/generatePlayersEnglish.js
```

## Generating All-Star song mapping

`scripts/generateAllStarSongs.js` merges the All-Star roster with each player's
cheer song information. The output is saved to
`public/data/allStarSongs2025.json`.

Run it whenever the All-Star or song data changes:

```bash
npm run build-allstar-songs
```

## Crawling English player names

`public/kbo_players_en_crawler.py` collects the official English names from
<http://eng.koreabaseball.com/Teams/PlayerSearch.aspx> and merges them with the
Korean player list using the same `playerId`. The resulting data is saved to
`public/data/kboPlayersEn.json`.

Run it manually:

```bash
python public/kbo_players_en_crawler.py
```

## Crawling schedules

`public/kbo_schedule_crawler.py` reuses the lineup crawler's Selenium logic to
collect basic game schedule information such as time, status and scores. The
results are written to `public/data/kboSchedule.json`.

Run it for a specific date range:

```bash
python public/kbo_schedule_crawler.py --start 2025-03-25 --end 2025-03-30 --output public/data/kboSchedule.json
```

## Automated daily crawl

Four GitHub Actions workflows keep the data updated:

- `.github/workflows/lineup-crawl.yml` fetches new lineups several times each day and rebuilds `public/data/kbo_crawler_data/index.json`.
- `.github/workflows/player-crawl.yml` updates `public/data/kboPlayers.json` daily at 00:00 UTC.
- `.github/workflows/team-rank-crawl.yml` refreshes `public/data/teamRank.json` once per day.
- `.github/workflows/schedule-crawl.yml` updates `public/data/kboSchedule.json` once per day.

All workflows commit any changes back to the repository automatically.

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

## Favorite team selection

On first visit the site asks you to choose your favorite team. The choice is saved
in `localStorage` under `favoriteTeam` so it persists across sessions. If you want
to pick again, clear your browser storage or remove that key.

## Stadium road weather

The app shows near-stadium road weather from the Korea Meteorological
Administration. A GitHub Actions workflow runs `update_weather.py` regularly and
writes the latest results to `public/data/kboBallparkWeather.json`. The mapping
of each ballpark to its CCTV ID lives in `public/data/ballpark_weather_sources.json`.
The workflow uses the secret `GOKR_WEATHER_API_KEY` when calling the API.

© 2025 직관가자. All rights reserved.
Created and maintained by Sumin Lee.
