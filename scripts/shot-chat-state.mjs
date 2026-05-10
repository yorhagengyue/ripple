import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const vp of [{w:1280,h:900,tag:'desktop'},{w:390,h:844,tag:'mobile'}]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  await page.goto('https://ripple-wellness.vercel.app/chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // Closed state (just see layout)
  await page.screenshot({ path: `/tmp/chat-closed-${vp.tag}.png` });

  // Open vitals
  await page.click('#chatVitalsToggle');
  await page.waitForFunction(() => {
    const cells = document.querySelectorAll('#chatVitalsRows .vcell');
    return cells.length > 0;
  }, { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `/tmp/chat-open-${vp.tag}.png` });
  console.log(`${vp.tag}: both shots saved`);
  await ctx.close();
}
await browser.close();
