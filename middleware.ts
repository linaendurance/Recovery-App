import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/env";

// createServerClient is overloaded (the old get/set/remove shape as well as
// this one), so TypeScript can't infer this parameter on its own.
type CookiesToSet = { name: string; value: string; options: CookieOptions }[];


// Routes that need no session at all. `/` and `/privacy` were each paying for
// a `getUser()` call — a network round trip to Supabase's auth server — on
// every single request. `/privacy` never reads a session, and `/` does its own
// check server-side in app/page.tsx, so the middleware call there was doing
// the work twice. These are also the two pages a signed-out visitor is most
// likely to land on first.
const SESSIONLESS_PATHS = new Set(["/", "/privacy"]);

// NOTE ON THE CSP: a nonce-based script-src was tried here and reverted. Next
// only stamps a nonce onto inline scripts it renders per request, and this
// app's entire signed-out surface — /login, /signup, /forgot, /reset,
// /privacy — is statically prerendered. Those pages ship inline scripts baked
// at build time, so a per-request nonce blocks them: measured as 5-7 "Refused
// to execute inline script" violations per page, with the login form falling
// back to a native GET submit because React never hydrated. Making it work
// means forcing every page dynamic, which turns each page view into a server
// render. The CSP therefore stays in next.config.mjs with 'unsafe-inline';
// connect-src remains the control that actually stops journal content leaving.
//
// Runs on every request. Two jobs: (1) refresh the Supabase session cookie
// so a logged-in visit never silently expires mid-use, and (2) keep signed-
// out people out of /app and signed-in people out of /login and /signup.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (SESSIONLESS_PATHS.has(request.nextUrl.pathname)) return response;

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
  // Anything that is not an HTML document is excluded outright: it needs
  // neither a session nor a security header, and every match here is a
  // function invocation that gets billed and adds latency.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|webmanifest)$).*)",
  ],
};
