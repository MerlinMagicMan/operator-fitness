import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthorizeUrl } from "@/lib/strava";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "strava_oauth_state";
const STATE_COOKIE_PATH = "/api/strava";
const STATE_TTL_SECONDS = 600;

/**
 * Kicks off the Strava OAuth flow. Generates a state nonce, stores it
 * in an httpOnly cookie scoped to /api/strava, and 302s to Strava's
 * authorize endpoint. Strava redirects back to /api/strava/callback,
 * which validates the state against the cookie before exchanging the
 * code for tokens.
 */
export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const state = randomBytes(32).toString("hex");

  let authorizeUrl: string;
  try {
    authorizeUrl = buildAuthorizeUrl(state);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Strava env not configured";
    const errorUrl = new URL("/", request.url);
    errorUrl.searchParams.set("strava_error", msg);
    return NextResponse.redirect(errorUrl);
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: STATE_COOKIE_PATH,
    maxAge: STATE_TTL_SECONDS,
  });
  return response;
}
