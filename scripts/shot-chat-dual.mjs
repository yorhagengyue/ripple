import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const vp of [{w:1440,h:900,tag:'desktop'},{w:390,h:844,tag:'mobile'}]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  await page.goto('https://ripple-wellness.vercel.app/chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500); // let stagger animations settle
  await page.screenshot({ path: `/tmp/chat-dual-${vp.tag}.png`, fullPage: false });
  // Also fire analyze to capture the bubble entrance
  try {
    await page.click('#chatVitalsAnalyze');
    await page.waitForFunction(() => !!document.querySelector('.msg--analysis'), { timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `/tmp/chat-dual-analyzed-${vp.tag}.png`, fullPage: false });
  } catch { console.log('analyze failed for', vp.tag); }
  console.log('done', vp.tag);
  await ctx.close();
}
await browser.close();
