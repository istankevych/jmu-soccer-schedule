import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fetchSchedule, DEFAULT_SEASON } from '../src/fetchSchedule.js';

function parseSeason(argv) {
  const i = argv.findIndex((a) => a === '--season' || a.startsWith('--season='));
  if (i === -1) return DEFAULT_SEASON;
  const raw = argv[i].includes('=') ? argv[i].split('=')[1] : argv[i + 1];
  if (!/^\d{4}$/.test(raw ?? '')) throw new Error(`Invalid --season value "${raw ?? ''}"`);
  return Number(raw);
}

try {
  const season = parseSeason(process.argv.slice(2));
  const warnings = [];
  const schedule = await fetchSchedule({ season, now: new Date(), warnings });
  for (const w of warnings) console.warn(`warning: ${w}`);
  if (schedule.games.length === 0) {
    throw new Error('No games were parsed; data/schedule.json left untouched');
  }
  const path = fileURLToPath(new URL('../data/schedule.json', import.meta.url));
  await writeFile(path, `${JSON.stringify(schedule, null, 2)}\n`);
  console.log(`Wrote ${schedule.games.length} games for ${season} to ${path}`);
} catch (err) {
  console.error(`Fetch failed: ${err.message}`);
  process.exit(1);
}
