import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// createServerClient is overloaded (the old get/set/remove shape as well as
// this one), so TypeScript can't infer this parameter on its own.
type CookiesToSet = { name: string; value: string; options: CookieOptions }[];

// These are Supabase's public URL and anon key — safe to ship in source.
// They identify the project; they don't grant access on their own. Every
// table that holds personal data is protected by Row Level Security, not
// by keeping this key secret.
const SUPABASE_URL = "https://gzhujyagleysqqmhsdyg.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6aHVqeWFnbGV5c3FxbWhzZHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNTc0MzMsImV4cCI6MjEwMDgzMzQzM30._eG422FhCohMgL5laBGgUCz0M8z0tO3ASGMQDF6kqBw";

// Runs on every request. Two jobs: (1) refresh the Supabase session cookie
// so a logged-in visit never silently expires mid-use, and (2) keep signed-
// out people out of /app and signed-in people out of /login and /signup.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAppRoute = request.nextUrl.pathname.startsWith("/app");
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");

  if (!user && isAppRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
