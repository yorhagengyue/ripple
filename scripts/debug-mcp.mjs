import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto('https://ripple-wellness.vercel.app/pipeline', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const dims = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { sel, w: r.width, h: r.height, x: r.x, mw: cs.maxWidth, minW: cs.minWidth, ow: el.scrollWidth };
  };
  return {
    vp: [window.innerWidth, window.innerHeight],
    body: document.body.scrollWidth,
    html: document.documentElement.scrollWidth,
    els: [
      pick('main'),
      pick('.pipeline-page'),
      pick('.pipe-timeline'),
      pick('.pipe-entry--tools'),
      pick('.pipe-entry--tools > .pipe-body'),
      pick('.mcp-connect'),
      pick('.mcp-panels'),
      pick('.mcp-code'),
    ].filter(Boolean),
  };
});
console.log(JSON.stringify(dims, null, 2));
await browser.close();
