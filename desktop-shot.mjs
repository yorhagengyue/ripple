import { chromium } from 'playwright';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
await page.goto('https://ripple-wellness.vercel.app/timeline', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.evaluate(() => {
  document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in'));
  document.querySelectorAll('section').forEach(el => el.classList.add('in'));
  document.querySelector('.story-chart')?.classList.add('is-drawing');
});
await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/ripple-timeline-desktop.png', fullPage: true });
await browser.close();
console.log('saved');
