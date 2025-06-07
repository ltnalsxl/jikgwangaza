# JikgwanGaja

JikgwanGaja is a React application for browsing KBO lineups, player walk-up songs and team chants. All information is kept in JSON files that ship with the repo so the app can run entirely offline.

## Updating JSON data

1. Edit the JSON files inside the top level `data/` folder.
2. Copy the updated files into `public/data/` so they are picked up by the web app:
   ```bash
   cp data/*.json public/data/
   ```
3. Commit the changes in both folders.

The app reads the JSON files directly from `public/data/` at runtime.

## Basic npm commands

```bash
npm install   # install dependencies
npm start     # start development server
npm test      # run unit tests
npm run build # build for production
```

Running these commands requires Node.js 20 or later.
