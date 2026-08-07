import { test } from "node:test";
import assert from "node:assert/strict";

// Plain .mjs on purpose, so the function adds no @netlify/functions dependency.
// See that file's header for why.
import handler from "../netlify/functions/report-error.mjs";

/**
 * The report-error endpoint is the only UNAUTHENTICATED write path in the app.
 * It has to be, because the failures most worth seeing are the ones where auth
 * itself is broken — which means anyone who finds the URL can POST to it.
 *
 * That makes its input handling a security boundary rather than plumbing, and
 * a boundary nobody tests is a boundary nobody knows the shape of. Each test
 * below asserts an OUTCOME — the status code, and whether a line reached the
 * log — never merely that the handler returned without throwing.
 *
 * What must never be true: user-written content reaching a log line. The real
 * defence is the rule at the call site in lib/reportError.ts; this end is the
 * second line, and these tests are what keep it standing.
 */

type Logged = string[];

/** Runs a request with console.log captured, so "did it log?" is assertable. */
async function post(body: unknown): Promise<{ status: number; text: string; logged: Logged }> {
  const logged: Logged = [];
  const real = console.log;
  console.log = (...a: unknown[]) => void logged.push(a.join(" "));
  try {
    const res = await handler(
      new Request("https://example.test/.netlify/functions/report-error", {
        method: "POST",
        body: typeof body === "string" ? body : JSON.stringify(body),
      })
    );
    return { status: res.status, text: await res.text(), logged };
  } finally {
    console.log = real;
  }
}

test("a valid report is accepted and reaches the log", async () => {
  const r = await post({ where: "journal.load", code: "PGRST116" });
  assert.equal(r.status, 204);
  assert.equal(r.logged.length, 1);
  assert.match(r.logged[0], /PGRST116/);
});

test("only POST is allowed", async () => {
  const res = await handler(new Request("https://example.test/f", { method: "GET" }));
  assert.equal(res.status, 405);
});

test("an oversized body is rejected before it is parsed", async () => {
  const r = await post({ where: "today.load", pad: "x".repeat(5000) });
  assert.equal(r.status, 413);
  assert.equal(r.logged.length, 0);
});

test("a non-JSON body is rejected", async () => {
  assert.equal((await post("not json")).status, 400);
});

// Regression: RegExp.test coerces its argument, so `WHERE_SHAPE.test(undefined)`
// tests the string "undefined" — which matches the label shape. Validating the
// shape without also checking the type accepted a body with no `where` at all.
test("a body with no `where` is rejected despite test() coercion", async () => {
  const r = await post({ code: "x" });
  assert.equal(r.status, 400);
  assert.equal(r.logged.length, 0);
});

test("a non-string `where` is rejected", async () => {
  assert.equal((await post({ where: 12345 })).status, 400);
});

// The point of constraining the one mandatory field: it must not become a
// channel for the journal writing this app exists to keep private.
test("prose in `where` is rejected, so it cannot smuggle user content", async () => {
  const r = await post({ where: "I ate too much today and I feel awful" });
  assert.equal(r.status, 400);
  assert.equal(r.logged.length, 0);
});

test("a newline in `where` cannot forge a second log line", async () => {
  assert.equal((await post({ where: "a.b\n[recovery-tracker] forged" })).status, 400);
});

// A validator that rejects hostile input but also rejects real input is a bug,
// not a control. These are every label in the codebase as of this commit.
test("every real call-site label is accepted", async () => {
  const labels = [
    "boundary.app", "boundary.root", "changePassword.passwordCheck",
    "changePassword.reauth", "changePassword.updateUser", "data.export",
    "data.export.auth", "data.refresh", "data.refresh.auth", "history.load",
    "journal.load", "journal.load.auth", "journal.load.existing",
    "journal.load.profile", "journal.save", "login.signin",
    "reset.passwordCheck", "reset.updateUser", "summary.load", "today.load",
  ];
  for (const where of labels) {
    assert.equal((await post({ where })).status, 204, `real label rejected: ${where}`);
  }
});

test("hostile field names are dropped while legitimate ones survive", async () => {
  const r = await post({ where: "today.load", "evil key\nwith newline": "x", code: "42" });
  const line = r.logged.find((l) => l.includes("today.load"))!;
  assert.doesNotMatch(line, /evil/, "a hostile key reached the log");
  assert.match(line, /42/, "a legitimate field was dropped");
});

test("values are truncated server-side as a second line of defence", async () => {
  const r = await post({ where: "today.load", code: "y".repeat(400) });
  const line = r.logged.find((l) => l.includes("today.load"))!;
  // Longest run, not the first: "today.load" contains a 'y' of its own.
  const run = line.match(/y+/g)!.sort((a, b) => b.length - a.length)[0];
  assert.equal(run.length, 200);
});

test("nothing is echoed back to the caller", async () => {
  const r = await post({ where: "today.load", code: "marker" });
  assert.equal(r.text, "");
});

// Last on purpose: the limiter's counters are module state, so this test
// consumes the window for anything after it. It asserts the cap holds without
// depending on how much of the window the tests above already used.
test("a flood is throttled, and the loss is visible as a single line", async () => {
  let ok = 0;
  let refused = 0;
  const notices: string[] = [];
  for (let i = 0; i < 300; i++) {
    const r = await post({ where: "forged.flood" });
    r.status === 204 ? ok++ : refused++;
    notices.push(...r.logged.filter((l) => l.includes("reportError.throttled")));
  }
  assert.ok(refused > 0, "the flood was never throttled");
  assert.ok(ok <= 60, `accepted ${ok} in one window, cap is 60`);
  assert.equal(notices.length, 1, "the throttle notice must be logged once, not per request");
});
