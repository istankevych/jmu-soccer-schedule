import * as cheerio from 'cheerio';

// Sidearm Sports schedule pages come in two markups:
// - legacy: `li.sidearm-schedule-game` list items;
// - nextgen (Nuxt): `s-game-card` elements identified by `data-test-id` attributes.
const LEGACY_SELECTOR = '.sidearm-schedule-game';
const NEXTGEN_SELECTOR = '[data-test-id="s-game-card-standard__root"]';
const TID = (id) => `[data-test-id="${id}"]`;

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const POSTSEASON_RE = /championship|ncaa|tournament|playoff/i;
const EXHIBITION_RE = /\bexhibition\b|\(exh\.?\)/i;
const PLACEHOLDER_RE = /^(tba|tbd)$/i;

function clean(text) {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

function orNull(text) {
  const t = clean(text);
  return t === '' || PLACEHOLDER_RE.test(t) ? null : t;
}

function toIsoDate(year, month, day) {
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null;
}

// Fall seasons run Aug-Dec; a yearless date in Jan-Jun belongs to the following calendar year.
function seasonYear(month, season) {
  return month <= 6 ? season + 1 : season;
}

export function parseGameDate(text, season) {
  const t = clean(text);
  let m = /\b([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/i.exec(t);
  if (m && MONTHS.includes(m[1].toLowerCase())) {
    const month = MONTHS.indexOf(m[1].toLowerCase()) + 1;
    const year = m[3] ? Number(m[3]) : seasonYear(month, season);
    return toIsoDate(year, month, Number(m[2]));
  }
  m = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/.exec(t);
  if (m) {
    const month = Number(m[1]);
    const year = m[3] ? Number(m[3]) : seasonYear(month, season);
    return toIsoDate(year, month, Number(m[2]));
  }
  return null;
}

export function normalizeTime(text) {
  const t = orNull(text);
  if (t === null) return null;
  if (/^noon$/i.test(t)) return '12:00 PM';
  const m = /^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?(?:\s+[a-z]{2,3})?$/i.exec(t);
  if (m) return `${Number(m[1])}:${m[2] ?? '00'} ${m[3].toUpperCase()}M`;
  return t;
}

// Returns { result } where result is null for upcoming games, or { error } for unrecognized text.
export function parseResult(text) {
  const t = clean(text);
  if (t === '') return { result: null };
  const m = /^([WLT])\b[\s,]*(\d+)\s*-\s*(\d+)(.*)$/i.exec(t);
  if (!m) return { error: `unrecognized result "${t}"` };
  const outcome = m[1].toUpperCase();
  const a = Number(m[2]);
  const b = Number(m[3]);
  const rest = m[4];
  let jmuGoals = a;
  let opponentGoals = b;
  if (outcome === 'W') [jmuGoals, opponentGoals] = [Math.max(a, b), Math.min(a, b)];
  if (outcome === 'L') [jmuGoals, opponentGoals] = [Math.min(a, b), Math.max(a, b)];
  const pk = /(\d+\s*-\s*\d+)\s*(?:pks?|pens?|so)\b/i.exec(rest) ??
    /\b(?:pks?|pens?|so)\s*,?\s*(\d+\s*-\s*\d+)/i.exec(rest);
  const result = { jmuGoals, opponentGoals, overtime: /\d*\s*OT\b/i.test(rest) || pk !== null };
  if (pk) result.penalties = pk[1].replace(/\s+/g, '');
  return { result };
}

function cleanOpponent(text) {
  let name = clean(text);
  const conference = name.includes('*');
  const exhibition = EXHIBITION_RE.test(name);
  name = name
    .replace(/\*/g, '')
    .replace(/\(exh(?:ibition)?\.?\)/gi, '')
    .replace(/^(?:(?:#|no\.\s*)\d+|\(?rv\)?)\s+/i, '');
  return { name: orNull(name), conference, exhibition };
}

function homeAwayFromStamp(text) {
  const t = clean(text).toLowerCase();
  if (t === 'at' || t === '@') return 'away';
  if (t === 'vs' || t === 'vs.') return 'home';
  return 'neutral';
}

function homeAwayFromLocationIndicator(indicator) {
  const t = clean(indicator).toUpperCase();
  if (t === 'H') return 'home';
  if (t === 'A') return 'away';
  if (t === 'N') return 'neutral';
  return null;
}

const NUXT_DATA_RE = /<script[^>]*\bid="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i;

/** Ordered home/away/neutral from Sidearm's Nuxt payload when present (matches nextgen card order). */
export function parseNuxtHomeAwayList(html) {
  const m = NUXT_DATA_RE.exec(html);
  if (!m) return null;
  let data;
  try {
    data = JSON.parse(m[1]);
  } catch {
    return null;
  }
  if (!Array.isArray(data)) return null;

  const resolve = (idx) => {
    let v = data[idx];
    let steps = 0;
    while (typeof v === 'number' && steps++ < 50) v = data[v];
    return v;
  };

  const list = [];
  for (const entry of data) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    if (!('location_indicator' in entry) || !('date' in entry)) continue;
    const homeAway = homeAwayFromLocationIndicator(resolve(entry.location_indicator));
    if (homeAway) list.push(homeAway);
  }
  return list.length > 0 ? list : null;
}

function extractNextgen($, el, nuxtHomeAway) {
  const card = $(el);
  const dateEl = card.find(`${TID('s-game-card-standard__header-game-date-details')}, ${TID('s-game-card-standard__header-game-date')}`);
  const facility = card.find('[data-test-id^="s-game-card-facility-and-location__"][data-test-id*="facility-title"]');
  const stampHomeAway = homeAwayFromStamp(card.find(TID('s-stamp__root')).first().text());
  const homeAway = nuxtHomeAway ?? stampHomeAway;
  return {
    dateText: dateEl.first().text(),
    timeText: card.find(`${TID('s-game-card-standard__header-game-time')} [aria-label="Event Time"]`).first().text(),
    opponentText: card.find('[data-test-id^="s-game-card-standard__header-team-opponent"]').first().text(),
    homeAway,
    location: orNull(card.find(TID('s-game-card-facility-and-location__standard-location-details')).first().text()) ??
      orNull(facility.first().text()),
    resultText: card.find(TID('s-game-card-standard__header-game-team-score')).first().text(),
    conference: card.find(TID('s-game-card-conference-logo__link')).length > 0,
    tournament: card.find(TID('s-descriptor__text')).map((_, d) => clean($(d).text())).get().join(' '),
    text: card.text()
  };
}

function extractLegacy($, el) {
  const item = $(el);
  const cls = item.attr('class') ?? '';
  const dateSpans = item.find('.sidearm-schedule-game-opponent-date').first().children('span');
  const timeEl = item.find('.sidearm-schedule-game-time');
  const locationEl = item.find('.sidearm-schedule-game-location').first();
  const locationSpans = locationEl.children('span');
  let homeAway = homeAwayFromStamp(item.find('.sidearm-schedule-game-conference-vs > span').last().text());
  if (/\bsidearm-schedule-home-game\b/.test(cls)) homeAway = 'home';
  if (/\bsidearm-schedule-away-game\b/.test(cls)) homeAway = 'away';
  if (/\bsidearm-schedule-neutral-game\b/.test(cls)) homeAway = 'neutral';
  return {
    dateText: dateSpans.first().text(),
    timeText: timeEl.length ? timeEl.first().text() : dateSpans.eq(1).text(),
    opponentText: item.find('.sidearm-schedule-game-opponent-name').first().text(),
    homeAway,
    location: orNull(locationSpans.length ? locationSpans.first().text() : locationEl.text()),
    resultText: item.find('.sidearm-schedule-game-result').first().text(),
    conference: /\bsidearm-schedule-game-conference\b/.test(cls) ||
      clean(item.find('.sidearm-schedule-game-conference-conference').text()) !== '',
    tournament: item.find('[class*="tournament"]').map((_, d) => clean($(d).text())).get().join(' '),
    text: `${cls} ${item.text()}`
  };
}

function toGame(raw, season) {
  const date = parseGameDate(raw.dateText, season);
  if (date === null) throw new Error(`missing or unparseable date "${clean(raw.dateText)}"`);
  const opponent = cleanOpponent(raw.opponentText);
  if (opponent.name === null) throw new Error('missing opponent');
  const { result, error } = parseResult(raw.resultText);
  let competition = 'regular';
  if (raw.conference || opponent.conference) competition = 'conference';
  if (POSTSEASON_RE.test(raw.tournament)) competition = 'postseason';
  if (opponent.exhibition || EXHIBITION_RE.test(raw.text)) competition = 'exhibition';
  const game = {
    date,
    time: normalizeTime(raw.timeText),
    opponent: opponent.name,
    homeAway: raw.homeAway,
    location: raw.location,
    competition,
    result: result ?? null
  };
  return { game, warning: error };
}

/**
 * Parses a Sidearm Sports schedule page into Game[] (see src/schedule.js for the model).
 * Bad games are skipped and described in `warnings` (pushed into the array passed in options).
 */
export function parseSidearmSchedule(html, { season, warnings = [] } = {}) {
  if (!Number.isInteger(season)) throw new TypeError('parseSidearmSchedule: season must be an integer');
  const $ = cheerio.load(html);
  const nuxtHomeAwayList = parseNuxtHomeAwayList(html);
  let nextgenIndex = 0;
  const games = [];
  $(`${LEGACY_SELECTOR}, ${NEXTGEN_SELECTOR}`).each((i, el) => {
    const label = `game #${i + 1}`;
    try {
      const isLegacy = $(el).is(LEGACY_SELECTOR);
      const nuxtHomeAway = !isLegacy && nuxtHomeAwayList
        ? nuxtHomeAwayList[nextgenIndex++]
        : undefined;
      const raw = isLegacy ? extractLegacy($, el) : extractNextgen($, el, nuxtHomeAway);
      const { game, warning } = toGame(raw, season);
      if (warning) warnings.push(`${label} (${game.opponent}, ${game.date}): ${warning}; result set to null`);
      games.push(game);
    } catch (err) {
      warnings.push(`${label}: skipped, ${err.message}`);
    }
  });
  return games;
}
