/**
 * The single source of Supabase connection settings.
 *
 * These used to be string literals repeated across four files
 * (middleware.ts, lib/supabase/client.ts, lib/supabase/server.ts and the
 * signup page). The justification written next to them — "the anon key isn't
 * secret" — is true and beside the point: *not secret* and *not configurable*
 * are different properties. Because the project ref was compiled into the
 * source, there was no way to point a build at a staging database without
 * editing code, which is why every migration ran against live user data.
 *
 * NEXT_PUBLIC_ values are inlined at build time, so this module works in
 * Server Components, Client Components and middleware alike.
 *
 * Missing values fail the BUILD rather than producing an app that renders and
 * then breaks on first use. A blank screen in production is a much worse
 * outcome than a red build.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}.\n` +
        `Copy .env.example to .env.local for local development, or set it in your ` +
        `hosting provider's environment settings (Netlify: Site configuration → ` +
        `Environment variables). See README "Configuration".`
    );
  }
  return value.trim();
}

export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL
);

export const SUPABASE_ANON_KEY = required(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/** Edge Function base. Derived rather than configured separately, so the two can never disagree. */
export const FUNCTIONS_URL = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1`;
