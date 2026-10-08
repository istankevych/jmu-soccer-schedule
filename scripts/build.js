import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const distDir = new URL('../dist/', import.meta.url);

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>JMU Men's Soccer Schedule</title>
</head>
<body>
  <h1>JMU Men's Soccer Schedule</h1>
  <p>Coming soon.</p>
</body>
</html>
`;

await mkdir(distDir, { recursive: true });
await writeFile(new URL('index.html', distDir), html);
console.log(`Wrote ${fileURLToPath(new URL('index.html', distDir))}`);
