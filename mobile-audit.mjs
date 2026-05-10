// Mobile UI audit for Ripple
import { chromium, devices } from 'playwright';

const PAGES = ['/', '/vitals', '/timeline', '/pipeline', '/chat'];
const BASE = process.env.BASE || 'https://ripple-wellness.vercel.app';

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['iPhone 13'],
  // 390x844 @ dpr 3
});
const page = await context.newPage();

function summarise(offenders) {
  return offenders.slice(0, 8).map(o =>
    `  ${o.tag}  w=${o.w} right=${o.right}  "${(o.text || '').slice(0, 40).replace(/\s+/g, ' ')}"`
  ).join('\n');
}

for (const p of PAGES) {
  await page.goto(BASE + p, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const report = await page.evaluate(() => {
    const vp = window.innerWidth;
    const pageW = document.documentElement.scrollWidth;
    const offenders = [];
    document.querySelectorAll('body *').forEach(el => {
      if (el.offsetParent === null) return;
      const r = el.getBoundingClientRect();
      if (r.right > vp + 2 && r.width > 30) {
        const text = (el.textContent || '').trim();
        offenders.push({
          tag: el.tagName.toLowerCase()
               + (el.id ? '#' + el.id : '')
               + (el.className ? '.' + String(el.className).slice(0, 40) : ''),
          right: Math.round(r.right),
          w: Math.round(r.width),
          text: text.slice(0, 60),
        });
      }
    });
    // Find tiny font sizes (< 10px) that aren't visually-hidden
    const tiny = [];
    document.querySelectorAll('body *').forEach(el => {
      if (el.offsetParent === null) return;
      const cs = getComputedStyle(el);
      const sz = parseFloat(cs.fontSize);
      if (sz && sz < 10 && (el.textContent || '').trim().length) {
        tiny.push({
          tag: el.tagName.toLowerCase() + '.' + String(el.className || '').slice(0, 30),
          size: sz.toFixed(1),
          text: (el.textContent || '').trim().slice(0, 40),
        });
      }
    });
    return {
      vp, pageW, overflowX: pageW > vp,
      offenders: offenders.sort((a,b) => b.right - a.right),
      tiny: tiny.slice(0, 5)
    };
  });

  console.log(`\n=== ${p}  ·  viewport=${report.vp}  pageWidth=${report.pageW}  overflowX=${report.overflowX} ===`);
  if (report.offenders.length === 0) console.log('  (no horizontal overflows)');
  else console.log(summarise(report.offenders));
  if (report.tiny.length) {
    console.log('  --- tiny text < 10px ---');
    report.tiny.forEach(t => console.log(`  ${t.tag} size=${t.size} "${t.text}"`));
  }
}

await browser.close();
