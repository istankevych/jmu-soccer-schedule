import { parseSidearmSchedule } from './sources/sidearm.js';
import { validateSchedule } from './schedule.js';

export const TEAM = 'James Madison Dukes';
export const DEFAULT_SEASON = 2026;

export function scheduleUrl(season) {
  return `https://jmusports.com/sports/mens-soccer/schedule/${season}`;
}

// Returns a copy with a fixed key order so that data/schedule.json diffs stay minimal.
export function orderSchedule(schedule) {
  const game = (g) => {
    const out = {
      date: g.date,
      time: g.time ?? null,
      opponent: g.opponent,
      homeAway: g.homeAway,
      location: g.location ?? null,
      competition: g.competition,
      result: null
    };
    if (g.result) {
      out.result = { jmuGoals: g.result.jmuGoals, opponentGoals: g.result.opponentGoals, overtime: g.result.overtime };
      if (g.result.penalties !== undefined) out.result.penalties = g.result.penalties;
    }
    return out;
  };
  return {
    season: schedule.season,
    team: schedule.team,
    updatedAt: schedule.updatedAt,
    games: schedule.games.map(game)
  };
}

/**
 * Downloads and parses the season schedule. Throws on HTTP errors and invalid data; parser warnings are pushed into `warnings`.
 * An empty `games` array is returned as-is; callers decide whether to persist it.
 */
export async function fetchSchedule({ season = DEFAULT_SEASON, fetchImpl = globalThis.fetch, now = new Date(), warnings = [] } = {}) {
  if (!Number.isInteger(season)) throw new TypeError('fetchSchedule: season must be an integer');
  const url = scheduleUrl(season);
  const response = await fetchImpl(url, { headers: { 'user-agent': 'jmu-soccer-schedule/0.1 (+static site builder)' } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`);
  }
  const html = await response.text();
  const games = parseSidearmSchedule(html, { season, warnings });
  const schedule = orderSchedule({ season, team: TEAM, updatedAt: new Date(now).toISOString(), games });
  const errors = validateSchedule(schedule);
  if (errors.length > 0) throw new Error(`Parsed schedule is invalid:\n- ${errors.join('\n- ')}`);
  return schedule;
}
