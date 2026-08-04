// Accessibility audit (axe-core, WCAG 2.1 A + AA) across every screen.
//
// This app is used by people who are unwell, often on a phone, sometimes at a
// bad moment. Contrast, focus order and labelling are not polish here.
//
// Usage: same two servers as scripts/e2e.js, then `npm run a11y`.
const { chromium } = require("playwright");
const { AxeBuilder } = require("@axe-core/playwright");

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3000";
const SIGNED_OUT = ["/login", "/signup", "/forgot", "/privacy"];
const SIGNED_IN = ["/app", "/app/log", "/app/journal", "/app/summary", "/app/history", "/app/sources", "/app/data"];

async function audit(page, path) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return violations.map((v) => ({
    path,
    id: v.id,
    impact: v.impact,
    help: v.help,
    n: v.nodes.length,
    example: (v.nodes[0]?.html || "").slice(0, 100),
  }));
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const all = [];

  for (const p of SIGNED_OUT) all.push(...(await audit(page, p)));

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "demo@recovery-demo.app");
  await page.fill("#password", "RecoveryDemo2026");
  await Promise.all([page.waitForURL("**/app", { timeout: 15000 }).catch(() => {}), page.click('button[type="submit"]')]);
  await page.waitForTimeout(1200);

  if (page.url().includes("/app")) {
    for (const p of SIGNED_IN) all.push(...(await audit(page, p)));
  } else {
    console.log("  (could not sign in — signed-in screens not audited)");
  }

  await browser.close();

  if (!all.length) return console.log("No WCAG 2.1 A/AA violations found.");
  const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  all.sort((a, b) => (order[a.impact] ?? 9) - (order[b.impact] ?? 9));
  for (const v of all) {
    console.log(`  [${(v.impact || "?").padEnd(8)}] ${v.path} — ${v.id} (${v.n}) ${v.help}`);
    console.log(`             ${v.example}`);
  }
  console.log(`\n${all.length} violation group(s).`);
  process.exit(1);
})();
