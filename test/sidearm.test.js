import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as cheerio from 'cheerio';
import {
  parseSidearmSchedule,
  parseGameDate,
  normalizeTime,
  parseResult,
  parseNuxtHomeAwayList
} from '../src/sources/sidearm.js';
import { validateSchedule } from '../src/schedule.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const asSchedule = (games) => ({ season: 2026, team: 'James Madison Dukes', updatedAt: null, games });

describe('parseSidearmSchedule on the real jmusports.com page (nextgen markup)', () => {
  const warnings = [];
  const games = parseSidearmSchedule(fixture('jmu-schedule-2026.html'), { season: 2026, warnings });
  const byOpponent = (name) => games.find((g) => g.opponent === name);

  it('parses every game without warnings', () => {
    expect(games).toHaveLength(20);
    expect(warnings).toEqual([]);
  });

  it('parses a completed home loss', () => {
    expect(games[0]).toEqual({
      date: '2026-08-20',
      time: '6:00 PM',
      opponent: 'Rider',
      homeAway: 'home',
      location: 'Harrisonburg, Va.',
      competition: 'regular',
      result: { jmuGoals: 0, opponentGoals: 1, overtime: false }
    });
  });

  it('parses away games, strips rankings and reads wins and ties', () => {
    expect(byOpponent('Princeton')).toMatchObject({
      date: '2026-09-04',
      homeAway: 'away',
      location: 'Princeton, N.J.',
      result: { jmuGoals: 0, opponentGoals: 2, overtime: false }
    });
    expect(byOpponent('UCF')).toMatchObject({ competition: 'conference', result: { jmuGoals: 1, opponentGoals: 0 } });
    expect(byOpponent('South Carolina')).toMatchObject({ homeAway: 'away', result: { jmuGoals: 1, opponentGoals: 1 } });
  });

  it('marks conference games', () => {
    expect(byOpponent('Liberty').competition).toBe('regular');
    expect(byOpponent('Marshall')).toMatchObject({ competition: 'conference', homeAway: 'away', location: 'Huntington, W.Va.' });
  });

  it('leaves upcoming games without a result', () => {
    const upcoming = games.filter((g) => g.date >= '2026-10-10');
    expect(upcoming).toHaveLength(9);
    expect(upcoming.every((g) => g.result === null)).toBe(true);
    expect(byOpponent('Georgia State')).toMatchObject({ date: '2026-10-10', time: '7:00 PM', homeAway: 'home' });
  });

  it('embeds Sidearm Nuxt payload with neutral location indicators', () => {
    const html = fixture('jmu-schedule-2026.html');
    expect(html).toMatch(/id="__NUXT_DATA__"/);
    const byDate = parseNuxtHomeAwayList(html);
    expect(byDate.size).toBe(20);
    expect(byDate.get('2026-08-20')).toBe('home');
    expect(byDate.get('2026-09-04')).toBe('away');
    expect([...byDate.values()].filter((v) => v === 'neutral')).toHaveLength(3);
  });

  it('uses Nuxt location_indicator when the visible stamp shows vs', () => {
    // Rewrite the payload so a regular-season home game (Rider, Aug 20) is neutral.
    const html = fixture('jmu-schedule-2026.html');
    const m = /(<script[^>]*id="__NUXT_DATA__"[^>]*>)([\s\S]*?)(<\/script>)/.exec(html);
    const data = JSON.parse(m[2]);
    const entry = data.find((e) => e && typeof e === 'object' && !Array.isArray(e) && 'location_indicator' in e);
    // devalue shares one 'H' slot across all home games, so repoint only this entry to a new 'N' value.
    entry.location_indicator = data.push('N') - 1;
    const patched = html.replace(m[0], () => m[1] + JSON.stringify(data) + m[3]);
    const $ = cheerio.load(patched);
    expect($('[data-test-id="s-stamp__root"]').first().text().trim().toLowerCase()).toMatch(/^vs\.?$/);
    const warnings = [];
    const parsed = parseSidearmSchedule(patched, { season: 2026, warnings });
    expect(parsed[0]).toMatchObject({ opponent: 'Rider', homeAway: 'neutral' });
    expect(parsed.find((g) => g.opponent === 'Gardner-Webb')).toMatchObject({ homeAway: 'home' });
    expect(warnings).toEqual([]);
  });

  it('falls back to the visible stamp with a warning when the payload does not match the cards', () => {
    const html = fixture('jmu-schedule-2026.html').replace(/2026-08-20T18:00:00/g, '2026-08-21T18:00:00');
    const warnings = [];
    const parsed = parseSidearmSchedule(html, { season: 2026, warnings });
    expect(parsed[0]).toMatchObject({ opponent: 'Rider', homeAway: 'home' });
    expect(warnings).toEqual(['2026-08-20: no matching Nuxt location_indicator, using the visible stamp']);
  });

  it('maps conference tournament placeholders to postseason with TBD fields as null', () => {
    expect(byOpponent('Quarterfinals')).toEqual({
      date: '2026-11-08',
      time: null,
      opponent: 'Quarterfinals',
      homeAway: 'neutral',
      location: null,
      competition: 'postseason',
      result: null
    });
  });

  it('passes validateSchedule', () => {
    expect(validateSchedule(asSchedule(games))).toEqual([]);
  });
});

describe('parseSidearmSchedule on legacy markup', () => {
  const warnings = [];
  const games = parseSidearmSchedule(fixture('sidearm-legacy-schedule.html'), { season: 2026, warnings });

  it('parses exhibitions, OT results and home/away/neutral', () => {
    expect(games.map((g) => [g.date, g.opponent, g.homeAway, g.competition])).toEqual([
      ['2026-08-15', 'Richmond', 'home', 'exhibition'],
      ['2026-08-28', 'Virginia Tech', 'away', 'regular'],
      ['2026-09-05', 'Navy', 'neutral', 'regular'],
      ['2026-09-12', 'Old Dominion', 'home', 'conference'],
      ['2026-09-19', 'Coastal Carolina', 'away', 'conference'],
      ['2026-11-13', 'Marshall', 'neutral', 'postseason']
    ]);
    expect(games.map((g) => g.result)).toEqual([
      { jmuGoals: 2, opponentGoals: 1, overtime: false },
      { jmuGoals: 0, opponentGoals: 1, overtime: true },
      { jmuGoals: 1, opponentGoals: 1, overtime: true },
      { jmuGoals: 3, opponentGoals: 2, overtime: true },
      null,
      { jmuGoals: 1, opponentGoals: 1, overtime: true, penalties: '4-3' }
    ]);
    expect(games.map((g) => g.time)).toEqual(['7:00 PM', '7:00 PM', '12:00 PM', '6:00 PM', '7:00 PM', null]);
    expect(games[5].location).toBeNull();
  });

  it('skips malformed entries and collects warnings', () => {
    expect(warnings).toHaveLength(3);
    expect(warnings[0]).toMatch(/Coastal Carolina.*unrecognized result "Canceled"/);
    expect(warnings[1]).toMatch(/game #6: skipped, missing or unparseable date "TBA"/);
    expect(warnings[2]).toMatch(/game #7: skipped, missing opponent/);
  });

  it('passes validateSchedule', () => {
    expect(validateSchedule(asSchedule(games))).toEqual([]);
  });
});

describe('parseSidearmSchedule edge cases', () => {
  it('returns an empty list for a page without games', () => {
    expect(parseSidearmSchedule('<html><body><p>Nothing</p></body></html>', { season: 2026 })).toEqual([]);
  });

  it('skips a nextgen card without a date', () => {
    const html = `<div data-test-id="s-game-card-standard__root">
      <a data-test-id="s-game-card-standard__header-team-opponent-link">Rider</a></div>`;
    const warnings = [];
    expect(parseSidearmSchedule(html, { season: 2026, warnings })).toEqual([]);
    expect(warnings).toEqual(['game #1: skipped, missing or unparseable date ""']);
  });

  it('requires an integer season', () => {
    expect(() => parseSidearmSchedule('', {})).toThrow(/season/);
  });
});

describe('helpers', () => {
  it('parseGameDate handles month names, numeric dates and the season year', () => {
    expect(parseGameDate('Aug 20 (Thu)', 2026)).toBe('2026-08-20');
    expect(parseGameDate('Sept. 4', 2026)).toBe('2026-09-04');
    expect(parseGameDate('Dec 1, 2025', 2026)).toBe('2025-12-01');
    expect(parseGameDate('9/12', 2026)).toBe('2026-09-12');
    expect(parseGameDate('Jan 3', 2026)).toBe('2027-01-03');
    expect(parseGameDate('Feb 30', 2026)).toBeNull();
    expect(parseGameDate('TBA', 2026)).toBeNull();
  });

  it('normalizeTime converts Sidearm formats', () => {
    expect(normalizeTime(' 6 p.m.')).toBe('6:00 PM');
    expect(normalizeTime('7:30 PM')).toBe('7:30 PM');
    expect(normalizeTime('11 a.m. ET')).toBe('11:00 AM');
    expect(normalizeTime('TBD')).toBeNull();
    expect(normalizeTime('')).toBeNull();
    expect(normalizeTime('All Day')).toBe('All Day');
  });

  it('parseResult reads scores from JMU perspective regardless of order', () => {
    expect(parseResult('L, 1-0').result).toEqual({ jmuGoals: 0, opponentGoals: 1, overtime: false });
    expect(parseResult('W, 0-2').result).toEqual({ jmuGoals: 2, opponentGoals: 0, overtime: false });
    expect(parseResult('L, 0-1 (2OT)').result.overtime).toBe(true);
    expect(parseResult('T, 0-0 (PKs 5-4)').result).toMatchObject({ overtime: true, penalties: '5-4' });
    expect(parseResult('')).toEqual({ result: null });
    expect(parseResult('Postponed').error).toMatch(/Postponed/);
  });
});
