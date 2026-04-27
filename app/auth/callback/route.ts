import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link callback. Exchanges the one-time code Supabase appended to the
 * email link for a session, sets the auth cookies, and forwards the user to
 * `next` (default `/`).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/";
  // Only allow same-origin redirects to keep the open-redirect surface zero.
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/";

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", url.origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=auth_failed", url.origin),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
