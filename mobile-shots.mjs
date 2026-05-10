import { chromium, devices } from 'playwright';
import fs from 'fs';

const PAGES = ['/', '/vitals', '/timeline', '/pipeline', '/chat'];
const BASE = process.env.BASE || 'https://ripple-wellness.vercel.app';
const OUT = '/tmp/ripple-shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext(devices['iPhone 13']);
const page = await context.newPage();

for (const p of PAGES) {
  await page.goto(BASE + p, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const file = `${OUT}/${p.replace(/\//g, '_') || 'home'}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(p, '→', file);
}
await browser.close();
