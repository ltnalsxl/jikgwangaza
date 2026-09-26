# JikgwanGaja

JikgwanGaja is a React application for browsing KBO lineups, player walk-up songs and team chants. All information is stored as JSON under `public/data` so the app can run entirely offline.

## Updating JSON data

Edit the JSON files directly inside `public/data/` or generate new lineup files using the crawler described below. The crawler automatically rebuilds `public/data/kbo_crawler_data/index.json` when it finishes, but you can run the indexing script manually:

```bash
npm run build-lineup-index
```

## Data pipeline (자동 갱신)

All data comes from public JSON endpoints and is committed to `public/data/`.
Each GitHub Actions workflow commits **only when the data actually changed** and
then calls `deploy.yml` directly (commits pushed with `GITHUB_TOKEN` do not fire
`push` events, which is why the live site used to stay stale for months).

| Workflow | When (KST) | Source | Output |
|---|---|---|---|
| `lineup-crawl.yml` | every 20 min 12:07–23:47, plus 01:17 / 07:17 | Naver Sports API | yesterday·today·tomorrow games: lineups, results, **probable starters** |
| `schedule-crawl.yml` | 09:53, 18:53 | Naver Sports API | next 30 days of games (rainout reschedules, announced starters) |
| `rank-crawl.yml` | 22:17, 23:17, 00:17, 10:17 | Naver statistics API | `teamRank.json` (incl. last 5 games) |
| `weather-crawl.yml` | xx:23 after each KMA release (02·05·…·23시) | KMA short-term forecast, Open-Meteo fallback | `kboBallparkForecast.json` (`forecastsByDate`) |
| `player-crawl.yml` | 09:37 (link check on Mondays) | koreabaseball.com + YouTube | `kboPlayers.json`, `playerSongs.json` |
| `deploy.yml` | called by the above, on push, and 06:41 daily | – | Firebase Hosting |

GitHub's cron is best-effort and runs are often delayed by 1–3 hours at busy
times, which is why schedules use odd minutes and overlap. If exact timing
matters, trigger `workflow_dispatch` from an external scheduler (e.g. cron-job.org).

Crawlers exit non-zero on failure (the previous data is kept), so a red run in
the Actions tab means something really broke.

Secrets: `FIREBASE_TOKEN` (required), `GOKR_WEATHER_API_KEY` (optional; KMA key,
otherwise Open-Meteo is used), `YOUTUBE_API_KEY` (optional; otherwise the
YouTube search page is parsed).

### Running the crawlers locally

```bash
pip install -r requirements-crawler.txt
# games in a date range (API only, no Chrome needed)
python public/kbo_crawler.py --mode range --start-date 2026-09-26 --end-date 2026-09-27 --no-selenium
python public/kbo_team_rank_crawler.py
python public/kbo_players_crawler.py
python fetch_short_term_weather.py
python scripts/sync_player_songs.py --dry-run   # see what would change
python scripts/fetch_chant_lyrics.py --dry-run  # lyrics for chants without them
npm run build-lineup-index                       # index.json + season-YYYY.json bundles
python -m unittest discover -s tests -p 'test_*.py'
```

`kbo_crawler.py` never overwrites a confirmed lineup with an unconfirmed one and
skips files whose content did not change. The app loads the compact
`season-YYYY.json` bundles (listed in `seasons.json`) instead of ~1,600 files.

### Probable starters and rotations

Naver publishes the next day's probable starters (선발 예고) in the evening; the
20-minute lineup crawl picks them up for **tomorrow** as well. The 일정 tab shows
`예고` (announced) starters, or `예상` (projected) ones for later games: the
pitcher with the longest rest among each team's last five distinct starters.
Tapping a game shows both teams' recent starts with dates and rest days
(`src/utils/rotation.js`).

Upcoming games also show where to buy tickets, based on the **home** team:
티켓링크 (KIA·삼성·LG·KT·한화), NOL 티켓 (두산·키움), or the club's own site
(SSG·롯데·NC). The detail view shows the usual general-sale opening rule and an
estimated opening time. Links and rules live in `src/utils/ticketing.js`;
re-check them each season.

### Player chants (응원가)

`scripts/sync_player_songs.py` keeps `playerSongs.json` in sync with the roster:

- attaches `playerId` to songs (to tell same-name players apart);
- detects players who changed teams; the old team's chant is kept for history,
  but the app only matches chants of the player's **current** team;
- searches YouTube for moved players and regular starters without a chant, and
  scores results (player name, "응원가", team name, trusted channels such as
  야쏭 or official team channels; penalties for AI, fan-made, compilations,
  other teams, and old uploads);
- adds matches scoring ≥ 8 with `"source": "youtube-auto", "verified": false`,
  and lists weaker candidates in the run summary for manual review;
- with `--check-links`, marks deleted or non-embeddable videos as
  `unavailable` and searches for a replacement (the lyrics are kept).

Search state is stored in `scripts/data/songSearchState.json` so each player is
re-searched at most weekly (every 2 days for moved players). To fix a chant by
hand, edit its entry and set `"verified": true`.

Lyrics: `scripts/fetch_chant_lyrics.py` runs right after the sync and fills
**empty** lyrics only (curated lyrics are never overwritten). It reads one
namu.wiki page per team (`{팀}/응원가/선수`), finds the player's section, and
takes the first lyrics block mentioning the player, skipping walk-up songs
(등장곡), song credits and footnotes. Filled entries get
`"lyricsSource": "namu.wiki"` and the app shows a 나무위키 (CC BY-NC-SA 2.0 KR)
credit under those lyrics.

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


© 2025 직관가자. All rights reserved.
Created and maintained by Sumin Lee.
