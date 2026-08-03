import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/env";

// createServerClient is overloaded (the old get/set/remove shape as well as
// this one), so TypeScript can't infer this parameter on its own.
type CookiesToSet = { name: string; value: string; options: CookieOptions }[];


// Used inside Server Components and Server Actions. Reads the user's
// session from cookies — it never uses the service-role key, so it is
// still fully subject to Row Level Security, same as the browser client.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Thrown when called from a Server Component with no response to
          // write to. Safe to ignore — middleware refreshes the session on
          // every request regardless.
        }
      },
    },
  });
}
