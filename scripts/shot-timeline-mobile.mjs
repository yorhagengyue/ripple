import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto('https://ripple-wellness.vercel.app/timeline', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.evaluate(() => {
  document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in'));
  document.querySelectorAll('section').forEach(el => el.classList.add('in'));
  document.querySelector('.story-chart')?.classList.add('is-drawing');
});
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/timeline-mobile.png', fullPage: true });
console.log('saved /tmp/timeline-mobile.png');
await browser.close();
