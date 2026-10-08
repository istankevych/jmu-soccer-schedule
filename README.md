# JMU Men's Soccer Schedule

A small static website that shows every game of the James Madison University (JMU Dukes) men's soccer season, with final scores for games that have already been played.

## How it works

- `data/schedule.json` is the single source of truth: one entry per match (date, opponent, home/away/neutral, location, competition type, result).
- `npm run fetch` downloads the official schedule page from jmusports.com, parses it and rewrites `data/schedule.json`.
- `npm run build` renders `data/schedule.json` into a static site in `dist/` (`index.html` + `styles.css`). No server, no database, no paid services.
- GitHub Actions deploys `dist/` to GitHub Pages.

You can also edit `data/schedule.json` by hand (e.g. to fix a score) and rebuild.

## Stack

- Node.js 20+ (plain JavaScript, ES modules)
- cheerio (HTML parsing for the data fetcher)
- Vitest (tests)

## Getting started

```bash
npm install       # install dependencies
npm test          # run the whole test suite once
npm run build     # generate dist/index.html
npm run fetch     # refresh data/schedule.json from jmusports.com (needs network)
```

Open `dist/index.html` in a browser to view the site, or serve it with any static file server (e.g. `npx serve dist`).

## Project layout

```
data/            schedule data (JSON)
src/             library code (data model, result formatting, rendering, parsers)
scripts/         CLI entry points (build, fetch)
public/          static assets copied into dist/ (CSS)
test/            Vitest tests and fixtures
dist/            build output (git-ignored)
```
