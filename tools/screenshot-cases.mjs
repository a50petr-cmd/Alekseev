import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = process.argv[2] || path.join(root, '_preview/cases-readability');
const base = process.env.SCREENSHOT_BASE || 'http://127.0.0.1:8765';

const shots = [
  { url: '/index.html#cases', name: 'home-390.png', width: 390, height: 900 },
  { url: '/index.html#cases', name: 'home-1440.png', width: 1440, height: 1200 },
];

const fullVerify = process.argv.includes('--full');
const extra = fullVerify
  ? [
      { url: '/case-x5.html', name: 'case-x5-390.png', width: 390, height: 900 },
      { url: '/case-x5.html', name: 'case-x5-1440.png', width: 1440, height: 1200 },
      { url: '/case-komus.html', name: 'case-komus-390.png', width: 390, height: 900 },
      { url: '/case-komus.html', name: 'case-komus-1440.png', width: 1440, height: 1200 },
      { url: '/case-modi.html', name: 'case-modi-390.png', width: 390, height: 900 },
      { url: '/case-modi.html', name: 'case-modi-1440.png', width: 1440, height: 1200 },
    ]
  : process.argv[3]
    ? JSON.parse(process.argv[3])
    : [];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
for (const s of [...shots, ...extra]) {
  const page = await browser.newPage({ viewport: { width: s.width, height: s.height } });
  await page.goto(base + s.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, s.name), fullPage: true });
  await page.close();
}
await browser.close();
console.log('Saved to', outDir);
