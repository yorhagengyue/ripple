import { chromium, devices } from 'playwright';
import fs from 'fs';

const PAGES = ['/pipeline', '/chat', '/timeline'];
const BASE = process.env.BASE || 'https://ripple-wellness.vercel.app';
const OUT = '/tmp/ripple-shots-r';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext(devices['iPhone 13']);
const page = await context.newPage();

for (const p of PAGES) {
  await page.goto(BASE + p, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  // Force-reveal all reveal elements for full-page screenshots
  await page.evaluate(() => {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in'));
    document.querySelectorAll('section').forEach(el => el.classList.add('in'));
    document.querySelector('.story-chart')?.classList.add('is-drawing');
  });
  await page.waitForTimeout(1500);
  const file = `${OUT}/${p.replace(/\//g, '_') || 'home'}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(p, '→', file);
}
await browser.close();
