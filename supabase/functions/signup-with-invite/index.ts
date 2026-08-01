import { createClient } from "jsr:@supabase/supabase-js@2";

// Provided automatically by the Edge Function runtime. The service role key
// never leaves this environment.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Salt for hashing caller IPs. Set IP_HASH_SALT in the function's secrets in
// production; the fallback keeps local development working. Raw IPs are never
// stored — only a salted hash, so the attempt log cannot be turned back into a
// list of who tried to sign up.
const IP_SALT = Deno.env.get("IP_HASH_SALT") ?? "recovery-tracker-dev-salt";

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

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`${IP_SALT}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// One message for every "we will not create this account" outcome. Saying
// "an account with that email already exists" would let anyone test whether a
// given person uses an eating-disorder recovery app — a meaningful privacy
// leak for this population, not just a generic enumeration issue.
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

  // Count recent failures from this IP and record this attempt. Brute-forcing
  // invite codes across an unbounded number of requests is now capped.
  const { data: recentFailures, error: rateError } = await admin.rpc(
    "register_signup_attempt",
    { p_ip_hash: ipHash, p_window_minutes: 15 },
  );
  if (rateError) {
    return json({ error: "Could not process the request. Try again." }, 500, origin);
  }
  if ((recentFailures ?? 0) >= 5) {
    return json(
      { error: "Too many attempts. Wait 15 minutes and try again." },
      429,
      origin,
    );
  }

  let body: {
    email?: string;
    password?: string;
    invite_code?: string;
    display_name?: string;
    birth_year?: number | string;
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

  if (!email || !password || !inviteCode) {
    return json({ error: "Email, password and invite code are all required." }, 400, origin);
  }
  if (password.length < 8 || password.length > 72) {
    return json({ error: "Password must be between 8 and 72 characters." }, 400, origin);
  }

  // Age gate. Reference nutrient values differ sharply for under-18s, and the
  // app should not silently show adult figures to an adolescent.
  const thisYear = new Date().getUTCFullYear();
  if (!Number.isFinite(birthYear)) {
    return json({ error: "Year of birth is required." }, 400, origin);
  }
  const approxAge = thisYear - birthYear;
  if (approxAge < 13) {
    return json(
      {
        error:
          "This app is for ages 13 and over. If you're younger, please work through a parent, carer or your care team.",
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

  await admin.rpc("mark_signup_success", { p_ip_hash: ipHash });
  return json({ success: true }, 200, origin);
});
