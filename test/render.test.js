import { describe, it, expect } from 'vitest';
import { renderPage, escapeHtml } from '../src/render.js';

const NOW = new Date('2026-09-15T12:00:00Z');

const game = (over = {}) => ({
  date: '2026-08-22',
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

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
    expect(escapeHtml(`a & b "c"`)).toBe('a &amp; b &quot;c&quot;');
  });
});

describe('renderPage', () => {
  it('returns a full HTML document with title, stylesheet, and all games', () => {
    const html = renderPage(
      sched([
        game({ opponent: 'A' }),
        game({ date: '2026-09-01', opponent: 'B', homeAway: 'away' })
      ]),
      { now: NOW }
    );
    expect(html).toMatch(/^<!DOCTYPE html>/i);
    expect(html).toContain('<title>JMU Men&#39;s Soccer — 2026 Schedule</title>');
    expect(html).toContain('<h1>JMU Men&#39;s Soccer — 2026 Schedule</h1>');
    expect(html).toContain('<link rel="stylesheet" href="styles.css">');
    expect(html).toContain('vs A');
    expect(html).toContain('at B');
  });

  it('links the stylesheet with a relative path so the site works under /<repo>/', () => {
    const html = renderPage(sched([game()]), { now: NOW });
    const hrefs = [...html.matchAll(/<link rel="stylesheet" href="([^"]*)">/g)].map((m) => m[1]);
    expect(hrefs).toEqual(['styles.css']);
    expect(html).not.toMatch(/(href|src)="\//);
  });

  it('escapes opponent names in the table', () => {
    const html = renderPage(sched([game({ opponent: '<script>x</script>' })]), { now: NOW });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('vs &lt;script&gt;x&lt;/script&gt;');
  });

  it('labels home, away, and neutral opponents', () => {
    const html = renderPage(
      sched([
        game({ opponent: 'Home U', homeAway: 'home' }),
        game({ opponent: 'Away U', homeAway: 'away' }),
        game({ opponent: 'Neutral U', homeAway: 'neutral' })
      ]),
      { now: NOW }
    );
    expect(html).toContain('vs Home U');
    expect(html).toContain('at Away U');
    expect(html).toContain('vs Neutral U (N)');
  });

  it('formats dates and shows time or result in the last column', () => {
    const html = renderPage(
      sched([
        game({
          date: '2026-08-22',
          result: { jmuGoals: 2, opponentGoals: 1, overtime: false }
        }),
        game({ date: '2026-09-10', time: '6:00 PM', result: null }),
        game({ date: '2026-10-01', time: null, result: null })
      ]),
      { now: NOW }
    );
    expect(html).toContain('Sat, Aug 22');
    expect(html).toContain('W 2-1');
    expect(html).toContain('6:00 PM');
    expect(html).toContain('>TBA<');
  });

  it('applies row classes for wins, losses, ties, and upcoming games', () => {
    const html = renderPage(
      sched([
        game({ result: { jmuGoals: 1, opponentGoals: 0, overtime: false } }),
        game({ result: { jmuGoals: 0, opponentGoals: 2, overtime: false } }),
        game({ result: { jmuGoals: 1, opponentGoals: 1, overtime: false } }),
        game({ result: null })
      ]),
      { now: NOW }
    );
    expect(html).toContain('class="game--win"');
    expect(html).toContain('class="game--loss"');
    expect(html).toContain('class="game--tie"');
    expect(html).toContain('class="game--upcoming"');
  });

  it('shows overall and conference records', () => {
    const html = renderPage(
      sched([
        game({ competition: 'exhibition', result: { jmuGoals: 9, opponentGoals: 0, overtime: false } }),
        game({ competition: 'regular', result: { jmuGoals: 2, opponentGoals: 1, overtime: false } }),
        game({ competition: 'conference', result: { jmuGoals: 0, opponentGoals: 1, overtime: false } }),
        game({ competition: 'conference', result: { jmuGoals: 3, opponentGoals: 3, overtime: true } }),
        game({ competition: 'conference', result: null })
      ]),
      { now: NOW }
    );
    expect(html).toContain('Overall: 1-1-1');
    expect(html).toContain('Conference: 0-1-1');
  });

  it('marks conference games with an asterisk and shows a legend', () => {
    const html = renderPage(
      sched([
        game({ competition: 'regular' }),
        game({ competition: 'conference', opponent: 'ODU' })
      ]),
      { now: NOW }
    );
    expect(html).toContain('Conference game');
    expect(html).toMatch(/Aug 22\*<\/td>\s*\n\s*<td data-label="Opponent">vs ODU<\/td>/);
  });

  it('shows last updated when updatedAt is set', () => {
    const html = renderPage(sched([game()], { updatedAt: '2026-09-01T18:30:00.000Z' }), {
      now: NOW
    });
    expect(html).toContain('Last updated:');
    expect(html).toContain('Sep 1, 2026');
  });

  it('omits last updated when updatedAt is null', () => {
    const html = renderPage(sched([game()]), { now: NOW });
    expect(html).not.toContain('Last updated');
  });

  it('shows a friendly message when there are no games', () => {
    const html = renderPage(sched([]), { now: NOW });
    expect(html).toContain('No games on the schedule yet.');
    expect(html).not.toContain('<table');
  });
});
