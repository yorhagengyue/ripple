import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.goto('https://ripple-wellness.vercel.app/pipeline', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in'));
  document.querySelectorAll('section').forEach(el => el.classList.add('in'));
});
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/pipeline-slim-top.png', fullPage: false });
await page.evaluate(() => window.scrollTo(0, 700));
await page.waitForTimeout(500);
await page.screenshot({ path: '/tmp/pipeline-slim-mid.png', fullPage: false });
console.log('saved');

// Also check 404 for old /vitals URL
const r = await page.goto('https://ripple-wellness.vercel.app/vitals', { waitUntil: 'networkidle' });
console.log('old /vitals status:', r.status());

await browser.close();
