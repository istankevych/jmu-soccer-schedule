import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { renderPage } from '../src/render.js';

const path = new URL('../public/styles.css', import.meta.url);

describe('public/styles.css', () => {
  it('exists and defines the row state classes', () => {
    expect(existsSync(path)).toBe(true);
    const css = readFileSync(path, 'utf8');
    for (const cls of ['.game--win', '.game--loss', '.game--tie', '.game--upcoming']) {
      expect(css).toContain(cls);
    }
  });

  it('collapses the table into cards on narrow screens', () => {
    const css = readFileSync(path, 'utf8');
    expect(css).toMatch(/@media \(max-width: (599px|600px)\)/);
    expect(css).toContain('attr(data-label)');
  });

  it('keeps the state accent colour on mobile cards', () => {
    const css = readFileSync(path, 'utf8');
    const mobile = css.slice(css.indexOf('@media'));
    for (const cls of ['win', 'loss', 'tie', 'upcoming']) {
      expect(mobile).toMatch(new RegExp(`tr\\.game--${cls}\\s*\\{\\s*border-left-color`));
    }
  });

  it('render output has data-label on all four cells', () => {
    const html = renderPage(
      { season: 2026, team: 'JMU', updatedAt: null, games: [{
        date: '2026-08-22', time: '7:00 PM', opponent: 'Richmond', homeAway: 'home',
        location: 'Harrisonburg, Va.', competition: 'regular', result: null
      }] },
      { now: new Date('2026-09-15T12:00:00Z') }
    );
    for (const label of ['Date', 'Opponent', 'Location', 'Time / Result']) {
      expect(html).toContain(`data-label="${label}"`);
    }
  });

  it('has no external resources', () => {
    const css = readFileSync(path, 'utf8');
    expect(css).not.toMatch(/https?:\/\/|@import/);
  });
});
