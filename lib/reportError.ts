/**
 * Single choke point for reporting a failure.
 *
 * The app had no error reporting of any kind: every `catch` set some local
 * state and the error died there, so a production incident was invisible.
 * Routing everything through one function means wiring a real tracker later
 * (Sentry, Highlight, whatever) is a change to THIS file only, rather than a
 * hunt through every component.
 *
 * PRIVACY RULE, and the reason this is not just `console.error` everywhere:
 * this app holds journal writing and food logs about someone's eating
 * disorder. Nothing user-written may ever reach an error report. The `where`
 * is a fixed code-site label and `extra` is for identifiers and status codes
 * only — never entry contents, journal answers, email addresses or names.
 */
export type ErrorContext = {
  /** Fixed label for the call site, e.g. "today.load". Never interpolated user text. */
  where: string;
  /** Small, non-identifying extras: status codes, counts, boolean flags. */
  extra?: Record<string, string | number | boolean | null>;
};

function scrub(value: unknown): string {
  if (value instanceof Error) return value.name;
  if (typeof value === "string") return value.slice(0, 200);
  return String(value).slice(0, 200);
}

/** Same-origin, so the existing `connect-src 'self'` in the CSP already allows it. */
const ENDPOINT = "/.netlify/functions/report-error";

/**
 * Reports are capped per page load. A component failing inside a render loop
 * would otherwise flood both the log and Netlify's function invocation budget.
 */
const MAX_REPORTS_PER_LOAD = 20;
let sent = 0;

/**
 * Ships the payload that has already been through `scrub`. Nothing new is
 * added here — this function must never widen what gets sent.
 */
function deliver(payload: Record<string, unknown>): void {
  // Server-side renders have real logs already; the console line is enough.
  if (typeof window === "undefined") return;
  if (sent >= MAX_REPORTS_PER_LOAD) return;
  sent++;

  try {
    // `keepalive` so a report survives the navigation that so often follows a
    // failure. Every error here is swallowed on purpose: a failed report must
    // never trigger another report, and must never surface to someone who is
    // already looking at a broken screen.
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* reporting is best-effort by definition */
  }
}

export function reportError(err: unknown, ctx: ErrorContext): void {
  const payload = {
    where: ctx.where,
    kind: scrub(err),
    ...ctx.extra,
    at: new Date().toISOString(),
  };

  // Structured so a log drain can parse it. The console line is kept because
  // it is what a developer sees while working; the POST is what reaches
  // somebody who can act on a production failure.
  console.error("[recovery-tracker]", JSON.stringify(payload));

  // Goes to this app's own Netlify function log — no third party is involved,
  // which is the whole reason it is a first-party endpoint rather than a
  // tracker SDK. See netlify/functions/report-error.mjs.
  deliver(payload);
}

/**
 * Supabase returns errors rather than throwing them, so `error.message` can
 * carry query fragments. Only the code and a fixed label are ever reported.
 */
export function reportSupabaseError(
  error: { code?: string; message?: string } | null,
  ctx: ErrorContext
): void {
  if (!error) return;
  reportError(new Error("SupabaseError"), {
    where: ctx.where,
    extra: { ...ctx.extra, code: error.code ?? "unknown" },
  });
}
