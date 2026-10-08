import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../src/build.js';

const fixture = fileURLToPath(new URL('./fixtures/schedule-valid.json', import.meta.url));
const now = new Date('2026-09-01T12:00:00Z');

let tmp;
let publicDir;
let outDir;

beforeEach(async () => {
  tmp = await mkdtemp(path.join(os.tmpdir(), 'jmus-build-'));
  publicDir = path.join(tmp, 'public');
  outDir = path.join(tmp, 'dist');
  await mkdir(path.join(publicDir, 'sub'), { recursive: true });
  await writeFile(path.join(publicDir, 'style.css'), 'body{}');
  await writeFile(path.join(publicDir, 'sub', 'a.txt'), 'a');
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('build', () => {
  it('writes index.html and copies public assets', async () => {
    await build({ dataPath: fixture, publicDir, outDir, now });
    const html = await readFile(path.join(outDir, 'index.html'), 'utf8');
    expect(html).toContain('Richmond');
    expect(await readFile(path.join(outDir, 'style.css'), 'utf8')).toBe('body{}');
    expect(await readFile(path.join(outDir, 'sub', 'a.txt'), 'utf8')).toBe('a');
  });

  it('rejects invalid data with a clear message and writes nothing', async () => {
    const bad = path.join(tmp, 'bad.json');
    await writeFile(bad, JSON.stringify({ season: 'x', games: [] }));
    await expect(build({ dataPath: bad, publicDir, outDir, now })).rejects.toThrow(/Invalid schedule data/);
    await expect(access(outDir)).rejects.toThrow();
  });

  it('rejects a missing data file', async () => {
    await expect(
      build({ dataPath: path.join(tmp, 'nope.json'), publicDir, outDir, now }),
    ).rejects.toThrow(/Cannot read schedule data/);
  });
});
