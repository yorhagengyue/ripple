import { chromium } from 'playwright';
const browser = await chromium.launch();

for (const vp of [{ w: 1280, h: 900, tag: 'desktop' }, { w: 390, h: 844, tag: 'mobile' }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  await page.goto('https://ripple-wellness.vercel.app/pipeline', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  // Force reveal animations
  await page.evaluate(() => {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in'));
    document.querySelectorAll('section').forEach(el => el.classList.add('in'));
  });
  // Scroll to the MCP block and screenshot it directly
  const el = await page.$('.mcp-connect');
  if (el) {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await el.screenshot({ path: `/tmp/mcp-${vp.tag}.png` });
    console.log(`saved /tmp/mcp-${vp.tag}.png`);
  } else {
    console.log(`No .mcp-connect found for ${vp.tag}`);
  }
  await ctx.close();
}
await browser.close();
