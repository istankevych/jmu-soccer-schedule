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

## Deployment

The site is hosted on GitHub Pages and deployed by `.github/workflows/deploy.yml`. The workflow runs:

- on every push to `main`,
- on manual dispatch (Actions → Deploy → Run workflow),
- daily at 10:00 UTC, so scores are refreshed after games.

Each run does `npm ci`, `npm run fetch`, `npm run build`, and publishes `dist/` with the official `actions/upload-pages-artifact` and `actions/deploy-pages` actions. If the fetch step fails (e.g. jmusports.com is down or its markup changed), the run continues and the site is built from the committed `data/schedule.json`. Fetched data is only used for the deployment and is not committed back.

One-time setup: in the repository settings, open Pages and set **Source** to **GitHub Actions**.

All asset paths in the generated HTML are relative (e.g. `styles.css`), so the site works under the project URL `https://<user>.github.io/<repo>/`.
