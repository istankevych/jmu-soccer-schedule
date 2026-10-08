import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fetchSchedule, scheduleUrl } from '../src/fetchSchedule.js';
import { validateSchedule } from '../src/schedule.js';

const html = readFileSync(new URL('./fixtures/jmu-schedule-2026.html', import.meta.url), 'utf8');
const now = new Date('2026-10-08T12:00:00Z');
const ok = (body) => async () => ({ ok: true, status: 200, text: async () => body });

describe('fetchSchedule', () => {
  it('fetches the season URL and returns a valid schedule', async () => {
    const urls = [];
    const fetchImpl = async (url) => {
      urls.push(url);
      return ok(html)();
    };
    const schedule = await fetchSchedule({ season: 2026, fetchImpl, now });
    expect(urls).toEqual([scheduleUrl(2026)]);
    expect(schedule.season).toBe(2026);
    expect(schedule.updatedAt).toBe('2026-10-08T12:00:00.000Z');
    expect(schedule.games).toHaveLength(20);
    expect(validateSchedule(schedule)).toEqual([]);
    expect(Object.keys(schedule)).toEqual(['season', 'team', 'updatedAt', 'games']);
  });

  it('rejects on HTTP errors', async () => {
    const fetchImpl = async () => ({ ok: false, status: 503, statusText: 'Service Unavailable', text: async () => '' });
    await expect(fetchSchedule({ fetchImpl, now })).rejects.toThrow(/HTTP 503/);
  });

  it('returns no games when the page has none', async () => {
    const schedule = await fetchSchedule({ fetchImpl: ok('<html></html>'), now });
    expect(schedule.games).toEqual([]);
  });
});
