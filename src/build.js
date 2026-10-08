import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadSchedule } from './schedule.js';
import { renderPage } from './render.js';

export async function build({ dataPath, publicDir, outDir, now = new Date() }) {
  let raw;
  try {
    raw = await readFile(dataPath, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read schedule data at ${dataPath}: ${err.message}`);
  }
  let schedule;
  try {
    schedule = loadSchedule(raw);
  } catch (err) {
    throw new Error(`Invalid schedule data in ${dataPath}: ${err.message}`);
  }
  const html = renderPage(schedule, { now });
  await mkdir(outDir, { recursive: true });
  await cp(publicDir, outDir, { recursive: true });
  const indexPath = path.join(outDir, 'index.html');
  await writeFile(indexPath, html);
  return { indexPath };
}
