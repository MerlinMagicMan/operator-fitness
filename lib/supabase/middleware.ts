import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieSet = { name: string; value: string; options?: CookieOptions };

const PUBLIC_PREFIXES = ["/login", "/auth"];

// Bail out of session validation if Supabase doesn't answer in this window.
// Vercel kills middleware around 25s and surfaces a 504
// MIDDLEWARE_INVOCATION_TIMEOUT; we surrender well before that so the page
// can render and surface its own auth state instead.
const AUTH_TIMEOUT_MS = 3000;

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Refresh the Supabase session on every request, then gate routes:
 *   - unauthenticated users are bounced to /login (except /login + /auth/*)
 *   - authenticated users hitting /login get redirected home
 *
 * Cookies set by Supabase's token refresh are forwarded onto every response
 * we return so the new tokens reach the browser.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    // Fail open in dev if Supabase isn't wired up — let the page render and
    // surface its own missing-env error rather than redirecting in a loop.
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieSet[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] =
    null;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<null>((resolve) => {
        timeoutHandle = setTimeout(() => resolve(null), AUTH_TIMEOUT_MS);
      }),
    ]);
    if (result === null) {
      // Supabase didn't answer in time. Fail open so the page can render and
      // its server components can re-attempt the auth check.
      return supabaseResponse;
    }
    user = result.data.user;
  } catch {
    // Network/auth error — same story, let the page handle it.
    return supabaseResponse;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }

  const pathname = request.nextUrl.pathname;
  const isPublic = isPublicPath(pathname);

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    const redirect = NextResponse.redirect(redirectUrl);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  return supabaseResponse;
}
