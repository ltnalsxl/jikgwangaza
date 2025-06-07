# JikgwanGaja

JikgwanGaja is a lightweight React application for browsing KBO lineups,
walk-up songs and team chants. All information ships as JSON so the
website can run entirely offline.

## JSON-driven workflow

The JSON files inside `data/` are the source of truth. During deployment
these files are copied into `public/data/` so the browser can fetch them
directly at runtime.

Data is maintained in a Google Sheet. A Google Apps Script exports the
sheet to JSON and automatically commits the updated files to GitHub. The
script overwrites the contents of both `data/` and `public/data/` to keep
the repository in sync with the spreadsheet.

## Development commands

```bash
npm install   # install dependencies
npm start     # start the development server
npm test      # run unit tests
npm run build # build for production
```

Node.js 20 or later is required.
