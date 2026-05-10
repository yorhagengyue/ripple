import { chromium } from 'playwright';
const browser = await chromium.launch();

for (const vp of [{ w: 1280, h: 900, tag: 'desktop' }, { w: 390, h: 844, tag: 'mobile' }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const page = await ctx.newPage();
  await page.goto('https://ripple-wellness.vercel.app/chat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // Before expanding
  await page.screenshot({ path: `/tmp/chat-vitals-closed-${vp.tag}.png`, fullPage: false });

  // Click "Show my vitals"
  await page.click('#chatVitalsToggle');
  // Wait for table rows to populate
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll('#chatVitalsRows tr');
    return rows.length > 0 && !rows[0].classList.contains('chat-vitals__empty');
  }, { timeout: 12000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `/tmp/chat-vitals-open-${vp.tag}.png`, fullPage: false });

  // Click AI analyze
  await page.click('#chatVitalsAnalyze');
  // Wait for analysis bubble to appear in log
  await page.waitForFunction(() => {
    return document.querySelector('.msg--analysis .msg-body p') != null;
  }, { timeout: 20000 });
  await page.waitForTimeout(500);
  // Scroll the chat log to bottom so analysis is visible
  await page.evaluate(() => {
    const log = document.getElementById('chatLog');
    if (log) log.scrollTop = log.scrollHeight;
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `/tmp/chat-vitals-analyzed-${vp.tag}.png`, fullPage: false });

  console.log(`${vp.tag}: 3 shots saved`);
  await ctx.close();
}
await browser.close();
