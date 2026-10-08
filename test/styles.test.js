import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const path = new URL('../public/styles.css', import.meta.url);

describe('public/styles.css', () => {
  it('exists and defines the row state classes', () => {
    expect(existsSync(path)).toBe(true);
    const css = readFileSync(path, 'utf8');
    for (const cls of ['.game--win', '.game--loss', '.game--tie', '.game--upcoming']) {
      expect(css).toContain(cls);
    }
  });

  it('has no external resources', () => {
    const css = readFileSync(path, 'utf8');
    expect(css).not.toMatch(/https?:\/\/|@import/);
  });
});
