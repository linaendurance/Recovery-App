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
  if (!payload || typeof payload !== "object" || typeof payload.where !== "string") {
    return new Response(null, { status: 400 });
  }

  const safe = {};
  for (const [key, value] of Object.entries(payload)) {
    if (Object.keys(safe).length >= MAX_FIELDS) break;
    if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
      safe[key] = clip(value);
    }
  }

  // One line per report, prefixed, so the log stays greppable.
  console.log("[recovery-tracker]", JSON.stringify(safe));

  // 204 with no body: nothing to leak, and the client ignores the result.
  return new Response(null, { status: 204 });
};
