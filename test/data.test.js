import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateSchedule } from '../src/schedule.js';

const data = JSON.parse(
  readFileSync(new URL('../data/schedule.json', import.meta.url), 'utf8')
);

describe('data/schedule.json', () => {
  it('validates', () => {
    expect(validateSchedule(data)).toEqual([]);
  });

  it('is the 2026 season with at least 10 games', () => {
    expect(data.season).toBe(2026);
    expect(data.games.length).toBeGreaterThanOrEqual(10);
  });
});
