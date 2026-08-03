// Breach-screens a candidate password for the password-RESET flow.
//
// signup-with-invite already screens passwords, but a reset goes through
// Supabase Auth directly and never touches that function — so without this,
// someone could reset TO a breached password even though they could not have
// signed up with one. This closes that gap.
//
// It lives server-side rather than in the browser for two reasons: the app's
// Content-Security-Policy restricts connect-src to Supabase only (adding
// api.pwnedpasswords.com would widen it for every page), and doing it here
// keeps one implementation of the check rather than two.
//
// verify_jwt is TRUE: the reset link establishes a recovery session before the
// new password is chosen, so a caller always has a token. That stops this
// being usable as an open proxy to the HIBP API.

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const DEFAULT_ALLOWED = [
  "https://recovery-nutrition-tracker.netlify.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.length > 0) return ALLOWED_ORIGINS.includes(origin);
  if (DEFAULT_ALLOWED.includes(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === "https:" && hostname.endsWith("--recovery-nutrition-tracker.netlify.app");
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (isAllowedOrigin(origin)) headers["Access-Control-Allow-Origin"] = origin!;
  return headers;
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

/**
 * k-anonymity: only the first five characters of the SHA-1 are sent. The
 * password and the full hash never leave this function. Add-Padding keeps
 * every response a uniform size so match counts cannot be inferred from
 * traffic. Returns null when unreachable so the caller can fail OPEN — an
 * HIBP outage must not stop somebody regaining access to their account.
 */
async function timesPwned(password: string): Promise<number | null> {
  try {
    const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
    const hash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const res = await fetch(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const suffix = hash.slice(5);
    for (const line of (await res.text()).split("\n")) {
      const [suf, count] = line.trim().split(":");
      if (suf === suffix) return Number(count) || 0;
    }
    return 0;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  if (!isAllowedOrigin(origin)) return json({ error: "Origin not allowed." }, 403, origin);

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400, origin);
  }

  const password = body.password || "";
  if (password.length < 8 || password.length > 72) {
    return json({ ok: false, reason: "length" }, 200, origin);
  }

  const pwned = await timesPwned(password);
  if (pwned !== null && pwned > 0) {
    return json({ ok: false, reason: "breached" }, 200, origin);
  }

  // ok:true also covers "HIBP unreachable" — deliberately failing open.
  return json({ ok: true, screened: pwned !== null }, 200, origin);
});
