import { createClient } from "jsr:@supabase/supabase-js@2";

// Provided automatically by the Edge Function runtime. The service role key
// never leaves this environment.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Salt for hashing caller IPs. Raw IPs are never stored — only a salted hash,
// so the attempt log cannot be reversed into a list of who tried to sign up.
//
// The fallback used to be a fixed string committed to the repository, which
// made the hashes trivially reversible by anyone who read the source. It now
// falls back to the service role key: high-entropy, secret, stable, and never
// leaves this runtime. Setting IP_HASH_SALT explicitly is still preferable so
// that rotating the service key does not reset rate-limit history.
const IP_SALT = Deno.env.get("IP_HASH_SALT") ?? SERVICE_ROLE_KEY;

// Cloudflare Turnstile. Optional: when TURNSTILE_SECRET is unset the check is
// skipped, which is correct while sign-up is invite-gated. It MUST be set
// before invite codes are removed — see the open-signup checklist in the repo.
const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET") ?? "";

// Current version of the privacy notice. Bump together with VERSION in
// app/privacy/page.tsx whenever the notice materially changes, so it stays
// possible to tell who agreed to which text.
const CONSENT_VERSION = "2026-08-05";

// verify_jwt is off (it has to be — sign-up happens before there is a session),
// so this endpoint is reachable by anyone. Previously it also sent
// Access-Control-Allow-Origin: *, meaning any website could drive it. Set
// ALLOWED_ORIGINS (comma-separated) once the app has a real domain.
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// The one deployed front end. Kept as an explicit exact-match default so the
// function is not wide open to every *.netlify.app site on the internet while
// ALLOWED_ORIGINS is still unset.
const DEFAULT_ALLOWED = [
  "https://recovery-nutrition-tracker.netlify.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.length > 0) return ALLOWED_ORIGINS.includes(origin);
  if (DEFAULT_ALLOWED.includes(origin)) return true;
  // Netlify deploy previews get a per-deploy subdomain, so they cannot be
  // listed exactly. Allow only previews OF THIS SITE.
  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === "https:" && hostname.endsWith("--recovery-nutrition-tracker.netlify.app");
  } catch {
    return false;
  }
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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

async function sha(algorithm: "SHA-1" | "SHA-256", value: string): Promise<string> {
  const digest = await crypto.subtle.digest(algorithm, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashIp(ip: string): Promise<string> {
  return await sha("SHA-256", `${IP_SALT}:${ip}`);
}

/**
 * Checks a password against the Have I Been Pwned breach corpus.
 *
 * Supabase Auth has this built in but it is disabled on this project and can
 * only be turned on from the dashboard, so it is implemented here instead.
 *
 * Uses k-anonymity: only the FIRST FIVE characters of the SHA-1 hash are sent.
 * The password itself, and the full hash, never leave this function. The
 * Add-Padding header makes every response a uniform size so the number of
 * returned matches cannot be inferred from traffic size.
 *
 * Returns null when the service cannot be reached — the caller fails OPEN, so
 * an HIBP outage degrades password screening rather than blocking all sign-ups.
 */
async function timesPwned(password: string): Promise<number | null> {
  try {
    const hash = (await sha("SHA-1", password)).toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const body = await res.text();
    for (const line of body.split("\n")) {
      const [suf, count] = line.trim().split(":");
      if (suf === suffix) return Number(count) || 0;
    }
    return 0;
  } catch {
    return null;
  }
}

// One message for every "we will not create this account" outcome. Saying
// "an account with that email already exists" would let anyone test whether a
// given person uses an eating-disorder recovery app — a meaningful privacy
// leak for this population, not just a generic enumeration issue.
/** Cloudflare Turnstile verification. Fails CLOSED: a configured CAPTCHA that
 *  cannot be verified must not silently let requests through. */
async function captchaOk(token: string, ip: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true; // not configured; invite code is the gate
  if (!token) return false;
  try {
    const body = new FormData();
    body.append("secret", TURNSTILE_SECRET);
    body.append("response", token);
    body.append("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    return Boolean((await res.json())?.success);
  } catch {
    return false;
  }
}

const GENERIC_REJECTION =
  "We couldn't create an account with those details. Check your invite code and email, or sign in if you already have an account.";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin);
  }
  if (!isAllowedOrigin(origin)) {
    return json({ error: "Origin not allowed." }, 403, origin);
  }

  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0].trim() || "unknown";
  const ipHash = await hashIp(ip);

  // Per-IP limiting. Failures are capped to stop invite-code brute force;
  // successes are capped separately so that removing the invite gate does not
  // leave account creation unbounded from a single address.
  const { data: rate, error: rateError } = await admin.rpc("register_signup_attempt", {
    p_ip_hash: ipHash,
    p_window_minutes: 15,
  });
  if (rateError) {
    return json({ error: "Could not process the request. Try again." }, 500, origin);
  }
  const failures = Number(rate?.failures ?? 0);
  const successes = Number(rate?.successes ?? 0);
  if (failures >= 5 || successes >= 3) {
    return json({ error: "Too many attempts. Wait 15 minutes and try again." }, 429, origin);
  }

  let body: {
    email?: string;
    password?: string;
    invite_code?: string;
    display_name?: string;
    birth_year?: number | string;
    captcha_token?: string;
    consent?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400, origin);
  }

  const email = (body.email || "").trim().toLowerCase().slice(0, 320);
  const password = body.password || "";
  const inviteCode = (body.invite_code || "").trim().slice(0, 128);
  const displayName = (body.display_name || "").trim().slice(0, 80);
  const birthYear = Number.parseInt(String(body.birth_year ?? ""), 10);

  if (!(await captchaOk((body.captcha_token || "").slice(0, 4096), ip))) {
    return json({ error: "Could not verify you are human. Please try again." }, 400, origin);
  }

  if (body.consent !== true) {
    return json({ error: "You need to accept the privacy notice to create an account." }, 400, origin);
  }

  if (!email || !password || !inviteCode) {
    return json({ error: "Email, password and invite code are all required." }, 400, origin);
  }
  if (password.length < 8 || password.length > 72) {
    return json({ error: "Password must be between 8 and 72 characters." }, 400, origin);
  }

  // Breach screening. Runs before the invite code is checked so a weak password
  // never consumes a single-use code.
  const pwned = await timesPwned(password);
  if (pwned !== null && pwned > 0) {
    return json(
      {
        error:
          "That password has appeared in a known data breach, so it is not safe to use here. Please choose a different one.",
      },
      400,
      origin,
    );
  }

  // Age gate, enforced HERE rather than in the browser — the sign-up page
  // checks the same thing, but anything client-side can be edited away in
  // devtools, so this is the copy that counts.
  //
  // 16, not 13. Several EU member states require parental consent below 16 for
  // an information-society service (GDPR Art 8), and this app has no way to
  // obtain or verify that. Separately, an eating-disorder monitoring tool used
  // by a minor with no clinician and no parent involved is the highest-risk
  // configuration it has — the reference values would also be wrong, since the
  // app only carries female figures.
  const MIN_AGE = 16;
  const thisYear = new Date().getUTCFullYear();
  if (!Number.isFinite(birthYear)) {
    return json({ error: "Year of birth is required." }, 400, origin);
  }
  const approxAge = thisYear - birthYear;
  if (approxAge < MIN_AGE) {
    return json(
      {
        error:
          "This app is for ages 16 and over, so an account can't be created. Please speak to a parent, carer, your GP or your care team — and if you need support now, your national eating disorder association or crisis line can help whatever your age.",
      },
      400,
      origin,
    );
  }
  if (approxAge > 120) {
    return json({ error: "Please check your year of birth." }, 400, origin);
  }

  // The service-role client bypasses RLS. This function is the ONLY place in
  // the app allowed to read invite_codes.
  const { data: invite, error: inviteError } = await admin
    .from("invite_codes")
    .select("code, used_by")
    .eq("code", inviteCode)
    .maybeSingle();

  if (inviteError) {
    return json({ error: "Could not verify invite code. Try again." }, 500, origin);
  }
  // Invalid and already-used are answered identically, so the endpoint cannot
  // be used to discover which codes exist.
  if (!invite || invite.used_by) {
    return json({ error: GENERIC_REJECTION }, 400, origin);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // the invite code IS the verification step
    user_metadata: {
      ...(displayName ? { display_name: displayName } : {}),
      birth_year: String(birthYear),
    },
  });

  if (createError || !created?.user) {
    return json({ error: GENERIC_REJECTION }, 400, origin);
  }

  // Atomically claim the code. The .is("used_by", null) guard means that if two
  // people redeem the same code at the same instant, only one update matches.
  const { data: updated, error: markError } = await admin
    .from("invite_codes")
    .update({ used_by: created.user.id, used_at: new Date().toISOString() })
    .eq("code", inviteCode)
    .is("used_by", null)
    .select("code");

  if (markError || !updated || updated.length === 0) {
    // Roll the account back so the code stays validly unused rather than being
    // burned with no real account behind it.
    await admin.auth.admin.deleteUser(created.user.id);
    return json(
      { error: "That invite code was just used by someone else. Ask for a new one." },
      409,
      origin,
    );
  }

  // Record consent against the profile the trigger just created. Best-effort:
  // the account is already valid, so a failure here is logged rather than
  // rolled back, but it stays visible as a null consented_at.
  const { error: consentError } = await admin
    .from("profiles")
    .update({ consented_at: new Date().toISOString(), consent_version: CONSENT_VERSION })
    .eq("id", created.user.id);
  if (consentError) console.error("consent_record_failed", created.user.id, consentError.message);

  await admin.rpc("mark_signup_success", { p_ip_hash: ipHash });
  return json({ success: true }, 200, origin);
});
