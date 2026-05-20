import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2, // retina for crisp video
});
const page = await ctx.newPage();

const targets = [
  { url: 'https://ripple-wellness.vercel.app/',          name: 'index' },
  { url: 'https://ripple-wellness.vercel.app/timeline',  name: 'timeline' },
  { url: 'https://ripple-wellness.vercel.app/pipeline',  name: 'pipeline' },
  { url: 'https://ripple-wellness.vercel.app/chat',      name: 'chat' },
];

for (const t of targets) {
  await page.goto(t.url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in'));
    document.querySelectorAll('section').forEach(el => el.classList.add('in'));
    document.querySelector('.story-chart')?.classList.add('is-drawing');
    // hide cursor in screenshots
    document.body.style.cursor = 'none';
  });
  // For chat page, auto-open and wait for vitals grid
  if (t.name === 'chat') {
    await page.waitForFunction(() => {
      const cells = document.querySelectorAll('#chatVitalsRows .vcell');
      return cells.length > 0;
    }, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
  const out = `src/assets/site-${t.name}.png`;
  await page.screenshot({ path: out, fullPage: false });
  console.log(`saved ${out}`);
}
await browser.close();
