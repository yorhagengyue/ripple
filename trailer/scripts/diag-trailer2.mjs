import {chromium} from 'playwright';

const URL = 'https://ripple-wellness.vercel.app/?t=' + Date.now();
const browser = await chromium.launch();
const ctx = await browser.newContext({viewport: {width: 1920, height: 1080}});
const page = await ctx.newPage();
await page.goto(URL, {waitUntil: 'networkidle'});
await page.waitForTimeout(1500);
await page.evaluate(() => {
  document.getElementById('loader')?.style.setProperty('display', 'none');
  document.getElementById('trailer')?.scrollIntoView({block: 'start'});
});
await page.waitForTimeout(600);

// Walk up from frame, log each ancestor's box + computed constraints
const chain = await page.evaluate(() => {
  let el = document.querySelector('.trailer-frame');
  const out = [];
  while (el && el.tagName !== 'HTML') {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    out.push({
      tag: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ').join('.') : ''),
      width: Math.round(r.width),
      height: Math.round(r.height),
      computed: {
        height: cs.height,
        maxHeight: cs.maxHeight,
        minHeight: cs.minHeight,
        display: cs.display,
        position: cs.position,
        overflow: cs.overflow,
        aspectRatio: cs.aspectRatio,
        flex: cs.flex,
        gridTemplateRows: cs.gridTemplateRows,
      },
      inlineStyle: el.getAttribute('style') || '',
    });
    el = el.parentElement;
  }
  return out;
});

console.log(JSON.stringify(chain, null, 2));
await browser.close();
