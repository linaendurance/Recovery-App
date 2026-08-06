// Failure-path end-to-end tests.
//
// scripts/e2e.js proves the screens RENDER. This one proves they render
// correctly when a query FAILS — which is a different thing, and the thing
// that has actually hurt users of this app.
//
// Both of the worst bugs found so far were silent-failure bugs, invisible to
// the type checker, the unit tests, the production build AND the happy-path
// e2e run, because every one of those only ever exercises success:
//
//   1. The journal discarded the error from its read of today's entry. A
//      failed read rendered an empty form, and because saving upserts on
//      (user_id, entry_date), the first save replaced a real reflection with
//      a blank one. Somebody's writing, gone, with no error shown.
//   2. The export wrote its file unconditionally, so a failed query downloaded
//      {"entries": null, "journals": null} under a correct-looking filename.
//      The worst outcome available for an export, because it looks like it
//      worked.
//
// Failures are forced with Playwright route interception rather than by
// stopping the fixture server, so only the ONE query under test fails and the
// rest of the page loads as it normally would. That is what devtools "offline"
// does, scoped to a single request.
//
// NOTE ON TIMING: supabase-js retries a failed request with backoff, so an
// error state takes several seconds to appear — measured at ~7s. Every wait
// here is on the state itself, never on a fixed delay. A too-short wait made
// this suite report a false failure the first time it was run.
//
// Usage: same two servers as scripts/e2e.js, then `npm run e2e:failures`.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const os = require("os");

const BASE = process.env.E2E_BASE || "http://127.0.0.1:3000";
const OUT = process.env.OUT_DIR || fs.mkdtempSync(path.join(os.tmpdir(), "e2e-fail-"));
const TIMEOUT = 30000;

let failures = 0;
const check = (name, pass, detail = "") => {
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
};

/** Wait for text to appear anywhere on the page. Never a fixed sleep. */
const waitForText = (page, re) =>
  page
    .waitForFunction((src) => new RegExp(src, "i").test(document.body.innerText), re.source, {
      timeout: TIMEOUT,
    })
    .catch(() => {});

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", "demo@recovery-demo.app");
  await page.fill("#password", "RecoveryDemo2026");
  await Promise.all([
    page.waitForURL("**/app", { timeout: 15000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(800);
  if (!page.url().includes("/app")) {
    console.log("could not sign in — is the fixture server running? aborting");
    process.exit(1);
  }

  // --- A. Journal: the read of today's stored entry fails -------------------
  // Before the fix this rendered an empty, editable, SAVEABLE form.
  console.log("\nA. Journal — today's entry fails to load");
  await page.route("**/rest/v1/journal_entries*", (route) => route.abort("failed"));
  const started = Date.now();
  await page.goto(`${BASE}/app/journal`, { waitUntil: "domcontentloaded" });
  await waitForText(page, /couldn't load today's reflection/);
  console.log(`  (error state appeared after ${((Date.now() - started) / 1000).toFixed(1)}s)`);

  const body = await page.locator("body").innerText();
  check("error state is shown", /couldn't load today's reflection/i.test(body));
  check("NO editable form is offered", (await page.locator("textarea").count()) === 0);
  check("NO Save control is reachable", (await page.getByRole("button", { name: /save reflection/i }).count()) === 0);
  check("a Retry control is offered", (await page.getByRole("button", { name: /^retry$/i }).count()) === 1);

  // --- B. Journal: retry once the network is back ---------------------------
  console.log("\nB. Journal — Retry recovers");
  await page.unroute("**/rest/v1/journal_entries*");
  await page.getByRole("button", { name: /^retry$/i }).click();
  await page.waitForSelector("textarea", { timeout: 20000 }).catch(() => {});
  check("form renders after retry", (await page.locator("textarea").count()) > 0);
  const saveBtn = page.getByRole("button", { name: /save reflection/i });
  check("Save enabled once the entry is confirmed read", (await saveBtn.count()) === 1 && (await saveBtn.isEnabled()));

  // --- C. Export: the entries query fails -----------------------------------
  // Before the fix this downloaded {"entries":null,"journals":null}.
  console.log("\nC. Export — entries query fails");
  await page.goto(`${BASE}/app/data`, { waitUntil: "networkidle" });
  let downloadFired = false;
  const onDownload = () => { downloadFired = true; };
  page.on("download", onDownload);

  await page.route("**/rest/v1/entries*", (route) => route.abort("failed"));
  await page.getByRole("button", { name: /export all data/i }).click();
  await waitForText(page, /no file was created/);
  await page.waitForTimeout(1500); // give any (wrong) download a chance to fire
  check("NO file was downloaded", downloadFired === false);
  check("failure is stated to the user", /no file was created/i.test(await page.locator("body").innerText()));

  // --- D. Saved days: a failed count must not read as "nothing yet" ---------
  console.log("\nD. Saved days — count query fails");
  await page.goto(`${BASE}/app/data`, { waitUntil: "domcontentloaded" });
  await waitForText(page, /couldn't load your saved days/);
  const dataText = await page.locator("body").innerText();
  check("error shown instead of a false empty state", /couldn't load your saved days/i.test(dataText));
  check('does NOT claim "Nothing saved yet"', !/nothing saved yet/i.test(dataText));

  // --- E. Export happy path: a real file whose counts match the screen ------
  console.log("\nE. Export — success path still works");
  await page.unroute("**/rest/v1/entries*");
  page.off("download", onDownload);
  await page.goto(`${BASE}/app/data`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }),
    page.getByRole("button", { name: /export all data/i }).click(),
  ]);
  const file = path.join(OUT, "export.json");
  await download.saveAs(file);
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  check("entries is an array, not null", Array.isArray(parsed.entries));
  check("journals is an array, not null", Array.isArray(parsed.journals));

  const m = (await page.locator("body").innerText()).match(
    /Exported (\d+) eating occasion[s]? and (\d+) reflection[s]?/
  );
  check("screen states the exported counts", Boolean(m), m ? m[0] : "no count message");
  if (m) {
    check("stated entry count matches the file", Number(m[1]) === parsed.entries.length,
      `screen=${m[1]} file=${parsed.entries.length}`);
    check("stated journal count matches the file", Number(m[2]) === parsed.journals.length,
      `screen=${m[2]} file=${parsed.journals.length}`);
  }

  await browser.close();
  console.log(`\n${failures === 0 ? "All failure-path checks passed." : `${failures} check(s) FAILED.`}`);
  process.exit(failures === 0 ? 0 : 1);
})();
