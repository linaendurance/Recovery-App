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

export function reportError(err: unknown, ctx: ErrorContext): void {
  const payload = {
    where: ctx.where,
    kind: scrub(err),
    ...ctx.extra,
    at: new Date().toISOString(),
  };

  // Structured so a log drain can parse it. Deliberately not sending anything
  // anywhere yet: shipping user data to a third party is exactly the thing
  // this app promises not to do, so the tracker has to be a decision, not a
  // default. Replace this line when one is chosen.
  console.error("[recovery-tracker]", JSON.stringify(payload));
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
