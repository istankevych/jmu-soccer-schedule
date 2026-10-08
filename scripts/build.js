import { fileURLToPath } from 'node:url';
import { build } from '../src/build.js';

const root = new URL('../', import.meta.url);
const at = (p) => fileURLToPath(new URL(p, root));

try {
  const { indexPath } = await build({
    dataPath: at('data/schedule.json'),
    publicDir: at('public/'),
    outDir: at('dist/'),
    now: new Date(),
  });
  console.log(`Wrote ${indexPath}`);
} catch (err) {
  console.error(`Build failed: ${err.message}`);
  process.exit(1);
}
