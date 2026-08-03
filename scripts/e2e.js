// Drives the SIGNED-IN screens in a real browser against the fixture server.
//
// Every crash-level bug found in this app so far — a timezone rejection, a
// negative duration, and a Rules of Hooks violation that broke Today and
// Summary on every load — lived in the loading -> loaded transition. The
// production build, the type checker and 36 unit tests all passed while two of
// those were live, because none of them ever render a component twice.
//
// This does. It signs in, walks every tab, and fails on any console error,
// page exception, failed request or React hook violation.
//
// Usage:
//   node scripts/mock-supabase.js 54321 &
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=mock npm run build && npm start &
//   node scripts/e2e.js
const { chromium } = require("playwright");

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3000";
const WIDTHS = [
  { w: 390, label: "phone" },
  { w: 1280, label: "desktop" },
];
const TABS = [
  ["/app", "Today"],
  ["/app/log", "Log a meal"],
  ["/app/journal", "Journal"],
  ["/app/summary", "Summary"],
  ["/app/history", "History"],
  ["/app/sources", "Sources"],
  ["/app/data", "Data"],
];

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
  });
  const failures = [];

  for (const { w, label } of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: 900 },
      isMobile: w < 700,
      hasTouch: w < 700,
    });
    const page = await ctx.newPage();

    const seen = [];
    page.on("console", (m) => { if (m.type() === "error") seen.push(`console: ${m.text().slice(0, 200)}`); });
    page.on("pageerror", (e) => seen.push(`exception: ${String(e).slice(0, 200)}`));
    page.on("requestfailed", (r) => {
      const f = r.failure();
      // Ignore aborts from client-side navigation.
      if (f && !/ERR_ABORTED/.test(f.errorText)) seen.push(`request failed: ${r.url().slice(0, 90)} ${f.errorText}`);
    });

    // Sign in through the real form, so the session cookie is written by
    // @supabase/ssr exactly as it is in production.
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill("#email", "demo@recovery-demo.app");
    await page.fill("#password", "RecoveryDemo2026");
    await Promise.all([
      page.waitForURL("**/app", { timeout: 15000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ]);
    await page.waitForTimeout(1500);

    if (!page.url().includes("/app")) {
      failures.push(`${label}: sign-in did not reach /app (stuck at ${page.url()})`);
      await ctx.close();
      continue;
    }

    for (const [path, name] of TABS) {
      seen.length = 0;
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      // Let the loading -> loaded transition actually happen. This is the
      // window in which every bug so far has appeared.
      await page.waitForTimeout(1200);

      const stillLoading = await page.locator(".rn-quiet").count();
      const errorCard = await page.locator(".rn-error-card").count();
      const bodyText = (await page.locator("body").innerText()).slice(0, 120).replace(/\n/g, " ");

      if (seen.length) failures.push(`${label} ${path}: ${seen.slice(0, 2).join(" | ")}`);
      if (stillLoading) failures.push(`${label} ${path}: stuck on loading state after 1.2s`);
      if (errorCard) failures.push(`${label} ${path}: rendered an error card — "${bodyText}"`);

      // Horizontal overflow on the signed-in screens, never checked before.
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) failures.push(`${label} ${path}: horizontal overflow ${overflow}px`);

      if (w === 390) {
        await page.screenshot({
          path: `${process.env.E2E_SHOTS || "./shots"}/${name.replace(/\W+/g, "-")}-390.png`,
          fullPage: true,
        });
      }
      process.stdout.write(`  ${label} ${path.padEnd(16)} ok\n`);
    }
    await ctx.close();
  }

  await browser.close();
  if (failures.length) {
    console.log("\nFAILURES:");
    failures.forEach((f) => console.log("  " + f));
    process.exit(1);
  }
  console.log("\nAll signed-in screens rendered clean at phone and desktop widths.");
})();
