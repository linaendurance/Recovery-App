/** @type {import('next').NextConfig} */

// The app shipped with no security headers at all. For something holding food
// logs and private journal writing, these are not optional extras:
//
//  - CSP stops injected script from running and, via connect-src, stops
//    exfiltration of journal content to any host that is not Supabase. Fonts
//    are self-hosted (see app/layout.tsx), so no external origin is needed.
//  - Referrer-Policy stops the URL of the page you were on leaking onward.
//  - frame-ancestors / X-Frame-Options stop the app being framed and
//    clickjacked into deleting somebody's data.
// Derived from the same variable the app connects with, so the CSP can never
// drift from the database it is actually talking to. Hardcoding it here was
// the fourth copy of the project ref and would have silently blocked every
// request the moment the app was pointed at a staging project.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL. Copy .env.example to .env.local, or set it " +
      "in your host's environment settings. Without it the Content-Security-Policy " +
      "cannot allow the database origin and every request would be blocked."
  );
}
const SUPABASE_ORIGIN = new URL(supabaseUrl).origin;
const SUPABASE_WS = SUPABASE_ORIGIN.replace(/^https:/, "wss:");

const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  // Next's App Router inlines a bootstrap script. 'unsafe-eval' is dev-only —
  // React Refresh needs it, production does not.
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS}`,
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
