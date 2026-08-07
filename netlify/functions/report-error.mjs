// Receives the already-scrubbed error payload from lib/reportError.ts and
// writes it to this function's log, visible in Netlify under Logs → Functions.
//
// WHY THIS EXISTS: every reportError call site is a client component, so
// `console.error` only ever reached the user's own browser console. A
// production incident was invisible to the only person who could act on it.
//
// WHY IT IS NOT AUTHENTICATED: the failures most worth seeing are the ones
// where auth itself is broken, so requiring a session would drop exactly the
// reports that matter most. The trade is that anyone can POST here, so this
// handler treats every body as hostile — it caps the size, keeps only scalar
// fields, truncates them, and never echoes anything back.
//
// WHAT MUST NEVER ARRIVE HERE: user-written content. Journal answers, entry
// notes, emails and names are all forbidden by the rule at the call site in
// lib/reportError.ts. This end re-truncates as a second line of defence, but
// it cannot tell prose from a status code — the call site is the real
// boundary, and it stays that way.
//
// Plain .mjs rather than TypeScript on purpose: it needs no @netlify/functions
// types, so it adds no dependency and stays outside the app's tsconfig.

const MAX_BODY_BYTES = 4096;
const MAX_FIELDS = 12;
const MAX_VALUE_CHARS = 200;

// Call-site labels are dotted lowercase identifiers — "journal.load.existing",
// "changePassword.reauth". Requiring that shape means the one field that MUST
// be present cannot itself be used to smuggle prose into the log, and junk
// traffic is rejected before anything is written. Checked against all 20
// existing labels; a new one only has to keep the same form.
const WHERE_SHAPE = /^[a-z][a-zA-Z0-9.]{0,60}$/;

// Field names come from the caller too, so they are constrained as well —
// otherwise the log line's structure is attacker-controlled and stops being
// greppable, which is the only reason the log is useful.
const KEY_SHAPE = /^[a-zA-Z0-9_.]{1,40}$/;

// Best-effort flood control, and worth being precise about what it does and
// does not do. It protects the SIGNAL: without it, anyone who finds this URL
// can bury real incident reports under thousands of forged lines, and the
// endpoint exists precisely so a real incident is visible.
//
// It does NOT protect Netlify's invocation budget — a rejected request is
// still an invocation. Nothing in this function can change that, and on the
// free tier there is no platform rate limiter to defer to. Saying so here so
// the next person does not mistake this for a spend control.
//
// Per warm instance, not global: Netlify scales out and each instance gets its
// own counter, so a distributed flood scales past this. It still cuts the case
// that costs nothing to mount, which is the one that actually happens.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
let windowStart = 0;
let accepted = 0;
let dropped = 0;

/** True if this report fits in the current window. Rolls the window over. */
function admit(now) {
  if (now - windowStart >= WINDOW_MS) {
    // Report the previous window's losses on rollover, so a flood shows up as
    // one line saying how much was lost rather than as silence.
    if (dropped > 0) {
      console.log("[recovery-tracker]", JSON.stringify({ where: "reportError.dropped", count: dropped }));
    }
    windowStart = now;
    accepted = 0;
    dropped = 0;
  }
  if (accepted >= MAX_PER_WINDOW) {
    // One line when the limiter engages, then silence until rollover.
    if (dropped === 0) {
      console.log("[recovery-tracker]", JSON.stringify({ where: "reportError.throttled" }));
    }
    dropped++;
    return false;
  }
  accepted++;
  return true;
}

const clip = (v) => (typeof v === "string" ? v.slice(0, MAX_VALUE_CHARS) : v);

export default async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }

  // `where` is a fixed call-site label and is the one field that must be
  // present; anything without it did not come from reportError.
  // The typeof check is not redundant with the regex: RegExp.test coerces its
  // argument, and `test(undefined)` tests the string "undefined", which
  // matches the label shape. A body with no `where` would have been accepted.
  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.where !== "string" ||
    !WHERE_SHAPE.test(payload.where)
  ) {
    return new Response(null, { status: 400 });
  }

  // After validation, before logging: a malformed flood is rejected without
  // consuming the window, so junk traffic cannot squeeze out real reports.
  if (!admit(Date.now())) return new Response(null, { status: 429 });

  const safe = {};
  for (const [key, value] of Object.entries(payload)) {
    if (Object.keys(safe).length >= MAX_FIELDS) break;
    if (!KEY_SHAPE.test(key)) continue;
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
      safe[key] = clip(value);
    }
  }

  // One line per report, prefixed, so the log stays greppable.
  console.log("[recovery-tracker]", JSON.stringify(safe));

  // 204 with no body: nothing to leak, and the client ignores the result.
  return new Response(null, { status: 204 });
};
