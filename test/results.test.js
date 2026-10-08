import { describe, it, expect } from 'vitest';
import { outcome, formatResult, seasonRecord } from '../src/results.js';

const r = (jmuGoals, opponentGoals, extra = {}) => ({
  jmuGoals,
  opponentGoals,
  overtime: false,
  ...extra
});
const g = (competition, result) => ({ competition, result });

describe('outcome', () => {
  it('returns W, L and T', () => {
    expect(outcome(r(2, 1))).toBe('W');
    expect(outcome(r(0, 3))).toBe('L');
    expect(outcome(r(1, 1))).toBe('T');
  });
  it('counts a penalty shootout as a tie', () => {
    expect(outcome(r(1, 1, { penalties: '4-3 PK' }))).toBe('T');
  });
});

describe('formatResult', () => {
  it('formats regulation results', () => {
    expect(formatResult(r(2, 1))).toBe('W 2-1');
    expect(formatResult(r(0, 3))).toBe('L 0-3');
  });
  it('adds OT', () => {
    expect(formatResult(r(1, 1, { overtime: true }))).toBe('T 1-1 (OT)');
    expect(formatResult(r(2, 1, { overtime: true }))).toBe('W 2-1 (OT)');
  });
  it('appends penalties', () => {
    expect(formatResult(r(1, 1, { overtime: true, penalties: '4-3 PK' }))).toBe(
      'T 1-1 (OT, 4-3 PK)'
    );
    expect(formatResult(r(0, 0, { penalties: '3-4 PK' }))).toBe('T 0-0 (3-4 PK)');
  });
});

describe('seasonRecord', () => {
  const games = [
    g('exhibition', r(2, 1)),
    g('regular', r(1, 1, { overtime: true })),
    g('conference', r(0, 2)),
    g('conference', r(3, 0)),
    g('conference', null),
    g('postseason', r(1, 0))
  ];
  it('counts played non-exhibition games', () => {
    expect(seasonRecord(games)).toEqual({ wins: 2, losses: 1, ties: 1 });
  });
  it('filters by competition', () => {
    expect(seasonRecord(games, { competition: 'conference' })).toEqual({
      wins: 1,
      losses: 1,
      ties: 0
    });
  });
  it('ignores unplayed games and handles empty input', () => {
    expect(seasonRecord([g('regular', null)])).toEqual({ wins: 0, losses: 0, ties: 0 });
    expect(seasonRecord([])).toEqual({ wins: 0, losses: 0, ties: 0 });
  });
  it('never counts exhibitions, even when filtered', () => {
    expect(seasonRecord(games, { competition: 'exhibition' })).toEqual({
      wins: 0,
      losses: 0,
      ties: 0
    });
  });
});
