import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const vp of [{w:1280,h:900,tag:'desktop'},{w:390,h:844,tag:'mobile'}]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  await page.goto('https://ripple-wellness.vercel.app/vitals', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in'));
    document.querySelectorAll('section').forEach(el => el.classList.add('in'));
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/vitals-${vp.tag}.png`, fullPage: true });
  console.log(`saved /tmp/vitals-${vp.tag}.png`);
  await ctx.close();
}
await browser.close();
