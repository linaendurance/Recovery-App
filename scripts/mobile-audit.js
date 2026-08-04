// Renders the signed-out pages at four real phone widths and reports the two
// failures that actually matter on a small screen: horizontal overflow, and
// controls too small to tap reliably.
//
// Inline links inside a sentence are exempt from WCAG 2.5.8's target-size
// rule, and a control wrapped in a <label> is tapped via the whole label — so
// this measures EFFECTIVE targets rather than raw element boxes, which
// otherwise produces a page of false positives.
//
// Usage:  npm start &  then  node scripts/mobile-audit.js ./shots
//
// Only covers signed-out pages. The signed-in screens need a live Supabase
// session and are not exercised here.
const { chromium } = require('playwright');
const OUT = process.argv[2];
const WIDTHS = [
  { w: 320, name: 'iPhone SE (smallest common)' },
  { w: 360, name: 'Android baseline' },
  { w: 390, name: 'iPhone 14/15' },
  { w: 430, name: 'iPhone Pro Max' },
];
const PAGES = ['/login', '/signup', '/forgot', '/privacy'];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const problems = [];
  for (const { w, name } of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: 800 },
      deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    });
    const page = await ctx.newPage();
    for (const path of PAGES) {
      await page.goto('http://127.0.0.1:3000' + path, { waitUntil: 'networkidle' });
      // Horizontal overflow: the single most common mobile layout failure.
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      // Any element wider than the viewport.
      const wide = await page.evaluate((vw) => {
        const bad = [];
        document.querySelectorAll('*').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > vw + 1 && r.height > 0) {
            bad.push((el.tagName.toLowerCase()) + (el.className ? '.' + String(el.className).split(' ')[0] : '') + ' w=' + Math.round(r.width));
          }
        });
        return [...new Set(bad)].slice(0, 4);
      }, w);
      // Effective tap targets. A control wrapped in a <label> is tapped via
      // the whole label, and WCAG 2.5.8 exempts links inline within a
      // sentence — measuring raw element boxes reported ~16 false positives
      // and would have trained anyone reading this to ignore it.
      const smallTaps = await page.evaluate(() => {
        const bad = [];
        document.querySelectorAll("a,button,input,select,textarea").forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (!rect.height) return;
          const label = el.closest("label");
          const eff = label ? label.getBoundingClientRect() : rect;
          const par = el.parentElement;
          const inline = el.tagName === "A" && par &&
            ["P", "SPAN", "EM", "LI", "TD"].includes(par.tagName) &&
            par.textContent.trim().length > el.textContent.trim().length + 5;
          if (inline) return;
          if (eff.height < 44 || eff.width < 44) {
            bad.push(`${el.tagName.toLowerCase()} ${Math.round(eff.width)}x${Math.round(eff.height)}`);
          }
        });
        return [...new Set(bad)].slice(0, 5);
      });
      if (overflow > 0) problems.push(`${w}px ${path}: horizontal overflow ${overflow}px [${wide.join(', ')}]`);
      if (smallTaps.length) problems.push(`${w}px ${path}: tap targets under 44px -> ${smallTaps.join(', ')}`);
      if (w === 390) await page.screenshot({ path: `${OUT}/${path.replace('/','')||'home'}-390.png`, fullPage: true });
    }
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? problems.map(p => '  ' + p).join('\n') : '  no layout problems found');
})();
