import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateSchedule, loadSchedule } from '../src/schedule.js';

const game = (over = {}) => ({
  date: '2026-09-01',
  time: '7:00 PM',
  opponent: 'Richmond',
  homeAway: 'home',
  location: 'Harrisonburg, Va.',
  competition: 'regular',
  result: null,
  ...over
});
const sched = (games = [game()], over = {}) => ({
  season: 2026,
  team: 'JMU',
  updatedAt: null,
  games,
  ...over
});

describe('validateSchedule', () => {
  it('accepts valid data', () => {
    const s = sched([game({ result: { jmuGoals: 1, opponentGoals: 1, overtime: true, penalties: '4-3' } })]);
    expect(validateSchedule(s)).toEqual([]);
  });

  it('accepts an empty games list', () => {
    expect(validateSchedule(sched([]))).toEqual([]);
  });

  it('rejects non-object input', () => {
    expect(validateSchedule(null)).toHaveLength(1);
  });

  it('reports bad date', () => {
    expect(validateSchedule(sched([game({ date: '2026-02-30' })]))[0]).toMatch(/games\[0\]\.date/);
    expect(validateSchedule(sched([game({ date: '09/01/2026' })]))[0]).toMatch(/date/);
  });

  it('reports bad homeAway', () => {
    expect(validateSchedule(sched([game({ homeAway: 'x' })]))[0]).toMatch(/homeAway/);
  });

  it('reports bad competition', () => {
    expect(validateSchedule(sched([game({ competition: 'x' })]))[0]).toMatch(/competition/);
  });

  it('reports negative or non-integer goals', () => {
    const bad = game({ result: { jmuGoals: -1, opponentGoals: 1.5, overtime: false } });
    const errors = validateSchedule(sched([bad]));
    expect(errors.some((e) => /jmuGoals/.test(e))).toBe(true);
    expect(errors.some((e) => /opponentGoals/.test(e))).toBe(true);
  });

  it('reports bad overtime and penalties', () => {
    const bad = game({ result: { jmuGoals: 1, opponentGoals: 0, overtime: 'yes', penalties: 3 } });
    const errors = validateSchedule(sched([bad]));
    expect(errors.some((e) => /overtime/.test(e))).toBe(true);
    expect(errors.some((e) => /penalties/.test(e))).toBe(true);
  });

  it('reports missing opponent', () => {
    expect(validateSchedule(sched([game({ opponent: '' })]))[0]).toMatch(/opponent/);
    expect(validateSchedule(sched([game({ opponent: undefined })]))[0]).toMatch(/opponent/);
  });

  it('reports bad time and location', () => {
    expect(validateSchedule(sched([game({ time: 5 })]))[0]).toMatch(/time/);
    expect(validateSchedule(sched([game({ location: 5 })]))[0]).toMatch(/location/);
  });

  it('reports bad top-level fields', () => {
    const errors = validateSchedule({ season: 'x', team: '', updatedAt: 'nope', games: 'x' });
    expect(errors).toHaveLength(4);
  });
});

describe('loadSchedule', () => {
  it('sorts by date then time, TBA last', () => {
    const s = sched([
      game({ date: '2026-09-02', opponent: 'C' }),
      game({ date: '2026-09-01', time: null, opponent: 'B' }),
      game({ date: '2026-09-01', time: '12:00 PM', opponent: 'A2' }),
      game({ date: '2026-09-01', time: '7:00 PM', opponent: 'A3' }),
      game({ date: '2026-09-01', time: '10:00 AM', opponent: 'A1' })
    ]);
    const out = loadSchedule(JSON.stringify(s));
    expect(out.games.map((g) => g.opponent)).toEqual(['A1', 'A2', 'A3', 'B', 'C']);
  });

  it('throws on invalid input', () => {
    expect(() => loadSchedule(sched([game({ date: 'bad' })]))).toThrow(/date/);
  });

  it('handles an empty games list', () => {
    expect(loadSchedule(sched([])).games).toEqual([]);
  });
});

describe('data/schedule.json', () => {
  it('is valid', () => {
    const json = readFileSync(new URL('../data/schedule.json', import.meta.url), 'utf8');
    expect(validateSchedule(JSON.parse(json))).toEqual([]);
    expect(loadSchedule(json).season).toBe(2026);
  });
});
