import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

const workflowUrl = new URL('../.github/workflows/ci.yml', import.meta.url);
const lockfileUrl = new URL('../package-lock.json', import.meta.url);

describe('CI workflow', () => {
  const yaml = readFileSync(workflowUrl, 'utf8');

  it('uses spaces for indentation (no tabs)', () => {
    expect(yaml).not.toMatch(/\t/);
  });

  it('runs on push and pull_request', () => {
    expect(yaml).toMatch(/^on:\s*$/m);
    expect(yaml).toMatch(/^\s+push:/m);
    expect(yaml).toMatch(/^\s+pull_request:/m);
  });

  it('uses Node 20', () => {
    expect(yaml).toMatch(/node-version:\s*['"]?20['"]?\s*$/m);
  });

  it('installs, tests and builds in that order', () => {
    const steps = ['npm ci', 'npm test', 'npm run build'].map((cmd) =>
      yaml.search(new RegExp(`run:\\s*${cmd}\\s*$`, 'm')),
    );
    steps.forEach((index) => expect(index).toBeGreaterThan(-1));
    expect([...steps].sort((a, b) => a - b)).toEqual(steps);
  });

  it('does not use secrets', () => {
    expect(yaml).not.toMatch(/secrets\./);
  });

  it('has a package-lock.json for npm ci', () => {
    expect(existsSync(lockfileUrl)).toBe(true);
  });
});
