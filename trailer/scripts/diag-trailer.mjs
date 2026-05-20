import {chromium} from 'playwright';

const URL = 'https://ripple-wellness.vercel.app/?t=' + Date.now();

const browser = await chromium.launch();
const ctx = await browser.newContext({viewport: {width: 1920, height: 1080}});
const page = await ctx.newPage();

await page.goto(URL, {waitUntil: 'networkidle'});
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';
  document.getElementById('trailer')?.scrollIntoView({block: 'start'});
});
await page.waitForTimeout(800);

const diag = await page.evaluate(() => {
  const frame = document.querySelector('.trailer-frame');
  const player = document.querySelector('.trailer-player');
  const iframe = document.querySelector('.trailer-player iframe');
  const chrome = document.querySelector('.trailer-chrome');

  const snap = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      w: Math.round(r.width),
      h: Math.round(r.height),
      paddingBottom: cs.paddingBottom,
      aspectRatio: cs.aspectRatio,
      height: cs.height,
      position: cs.position,
      overflow: cs.overflow,
      display: cs.display,
    };
  };

  return {
    frame: snap(frame),
    chrome: snap(chrome),
    player: snap(player),
    iframe: snap(iframe),
    innerHTML_head: document.head.innerHTML.slice(0, 400),
    has_inline_style: document.head.innerHTML.includes('padding-bottom: 56.25%'),
  };
});

console.log(JSON.stringify(diag, null, 2));
await browser.close();
