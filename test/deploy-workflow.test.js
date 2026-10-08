import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const workflowUrl = new URL('../.github/workflows/deploy.yml', import.meta.url);

describe('Deploy workflow', () => {
  const yaml = readFileSync(workflowUrl, 'utf8');

  it('uses spaces for indentation (no tabs)', () => {
    expect(yaml).not.toMatch(/\t/);
  });

  it('runs on push to main, manual dispatch and a daily schedule', () => {
    expect(yaml).toMatch(/^\s+push:\s*\n\s+branches:\s*\[\s*main\s*\]/m);
    expect(yaml).toMatch(/^\s+workflow_dispatch:/m);
    expect(yaml).toMatch(/^\s+schedule:\s*\n\s+- cron:\s*'\d+ \d+ \* \* \*'/m);
  });

  it('has the permissions required by GitHub Pages', () => {
    expect(yaml).toMatch(/^\s+pages:\s*write\s*$/m);
    expect(yaml).toMatch(/^\s+id-token:\s*write\s*$/m);
  });

  it('installs, fetches and builds in that order', () => {
    const steps = ['npm ci', 'npm run fetch', 'npm run build'].map((cmd) =>
      yaml.search(new RegExp(`run:\\s*${cmd}\\s*$`, 'm')),
    );
    steps.forEach((index) => expect(index).toBeGreaterThan(-1));
    expect([...steps].sort((a, b) => a - b)).toEqual(steps);
  });

  it('continues when the fetch step fails', () => {
    expect(yaml).toMatch(/run:\s*npm run fetch\s*\n\s+continue-on-error:\s*true/);
  });

  it('deploys dist/ with the official Pages actions', () => {
    expect(yaml).toMatch(/uses:\s*actions\/upload-pages-artifact@v\d+\s*\n\s+with:\s*\n\s+path:\s*dist\s*$/m);
    expect(yaml).toMatch(/uses:\s*actions\/deploy-pages@v\d+/);
  });

  it('does not use secrets', () => {
    expect(yaml).not.toMatch(/secrets\./);
  });
});
