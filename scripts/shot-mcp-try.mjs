import { chromium } from 'playwright';
const browser = await chromium.launch();

for (const vp of [{ w: 1280, h: 900, tag: 'desktop' }, { w: 390, h: 844, tag: 'mobile' }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  await page.goto('https://ripple-wellness.vercel.app/pipeline', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in'));
    document.querySelectorAll('section').forEach(el => el.classList.add('in'));
  });
  // Click the Try-it-live Call button and wait for response to render
  await page.click('#mcpTryRun');
  await page.waitForFunction(() => {
    const r = document.getElementById('mcpTryResult');
    return r && r.textContent && r.textContent.length > 60 && !r.textContent.startsWith('calling');
  }, { timeout: 12000 });
  await page.waitForTimeout(400);
  const el = await page.$('.mcp-try');
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await el.screenshot({ path: `/tmp/mcp-try-${vp.tag}.png` });
  console.log(`saved /tmp/mcp-try-${vp.tag}.png`);
  await ctx.close();
}
await browser.close();
