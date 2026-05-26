// Verify the deployed trailer frame occupies enough viewport.
// Runs at 1920x1080, scrolls to #trailer, measures frame size, screenshots.

import {chromium} from 'playwright';
import {mkdir, writeFile} from 'fs/promises';

const URL = 'https://ripple-wellness.vercel.app/';
const OUT_DIR = '/Users/gengyue/Desktop/ripple/verify';
const VIEWPORTS = [
  {w: 1920, h: 1080, name: '1920x1080'},
  {w: 1440, h: 900, name: '1440x900'},
  {w: 2560, h: 1440, name: '2560x1440'},
];

await mkdir(OUT_DIR, {recursive: true});

const browser = await chromium.launch();
const results = [];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: {width: vp.w, height: vp.h},
    deviceScaleFactor: 1,
    // Force cache miss
    extraHTTPHeaders: {'Cache-Control': 'no-cache'},
  });
  const page = await ctx.newPage();

  await page.goto(URL, {waitUntil: 'networkidle'});
  // Let loader disappear
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
  });

  // Jump to trailer section
  await page.evaluate(() => {
    document.getElementById('trailer')?.scrollIntoView({block: 'start', behavior: 'instant'});
  });
  await page.waitForTimeout(800);

  // Measure frame
  const metrics = await page.evaluate(() => {
    const f = document.querySelector('.trailer-frame');
    if (!f) return null;
    const r = f.getBoundingClientRect();
    const cs = getComputedStyle(f);
    return {
      width: Math.round(r.width),
      height: Math.round(r.height),
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      maxWidth: cs.maxWidth,
      aspectRatio: cs.aspectRatio,
    };
  });

  const shotPath = `${OUT_DIR}/trailer-${vp.name}.png`;
  await page.screenshot({path: shotPath, fullPage: false});

  const viewportFillPct = metrics
    ? ((metrics.height / vp.h) * 100).toFixed(1) + '%'
    : 'n/a';

  results.push({viewport: vp.name, ...metrics, viewportFillPct, shot: shotPath});
  await ctx.close();
}

await browser.close();

const report = results
  .map(
    (r) =>
      `${r.viewport.padEnd(12)} · frame ${String(r.width).padStart(4)}×${String(r.height).padStart(4)}  ` +
      `(${r.viewportFillPct} of viewport height)  top=${r.top}px`,
  )
  .join('\n');

console.log(report);
await writeFile(`${OUT_DIR}/report.txt`, report + '\n');
