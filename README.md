# JikgwanGaja

JikgwanGaja is a React application for browsing KBO lineups, player walk-up songs and team chants. All information is kept in JSON files that ship with the repo so the app can run entirely offline.

## Updating JSON data

Edit the JSON files directly inside `public/data/` and commit your changes.
The app reads the JSON files from this folder at runtime.

## Basic npm commands

```bash
npm install   # install dependencies
npm start     # start development server
npm test      # run unit tests
npm run build # build for production
```

Running these commands requires **Node.js 20 or later**.

## Crawling new KBO lineups

The repository includes `public/kbo_crawler.py` for scraping lineups from
Naver. It requires Python 3 and the following packages:

- `requests`
- `beautifulsoup4`
- `pandas`
- `selenium` (Chrome and ChromeDriver must be installed)

Install the dependencies with:

```bash
pip install requests beautifulsoup4 pandas selenium
```

Run the crawler in incremental mode (recent 3 days) with:

```bash
python public/kbo_crawler.py --mode incremental --days 3
```

JSON files for each game and a CSV summary are saved in
`public/data/kbo_crawler_data/` by default. Use `--save_dir` to change the
output directory.

After verifying the output, merge or copy the generated files into the JSON
files under `public/data/` (for example `gameLineups.json`) and commit the
changes so the app loads the updated data at runtime.
