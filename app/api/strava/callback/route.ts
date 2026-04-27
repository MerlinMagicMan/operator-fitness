import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, expiresAtToISO } from "@/lib/strava";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATE_COOKIE = "strava_oauth_state";
const STATE_COOKIE_PATH = "/api/strava";

function redirectHome(
  request: Request,
  params: Record<string, string>,
): NextResponse {
  const url = new URL("/", request.url);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const response = NextResponse.redirect(url);
  // Clear the state cookie regardless of outcome.
  response.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: STATE_COOKIE_PATH,
    maxAge: 0,
  });
  return response;
}

/**
 * Strava redirects the user back here after they approve (or deny).
 * Validate the state nonce, exchange the auth code for tokens, and
 * upsert into oauth_tokens. Always lands the user back at "/" with a
 * status query string, never a JSON response.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const scope = url.searchParams.get("scope");

  if (error) {
    return redirectHome(request, { strava_error: error });
  }

  if (!code || !state) {
    return redirectHome(request, { strava_error: "missing_code_or_state" });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const cookieState = request.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.split("=")[1];

  if (!cookieState || cookieState !== state) {
    return redirectHome(request, { strava_error: "state_mismatch" });
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "token_exchange_failed";
    return redirectHome(request, { strava_error: msg });
  }

  const { error: upsertError } = await supabase.from("oauth_tokens").upsert(
    {
      user_id: user.id,
      provider: "strava",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAtToISO(tokens.expires_at),
      scope: tokens.scope ?? scope ?? null,
      athlete_id: tokens.athlete?.id != null ? String(tokens.athlete.id) : null,
      raw: tokens,
    },
    { onConflict: "user_id,provider" },
  );

  if (upsertError) {
    return redirectHome(request, {
      strava_error: `db_upsert_failed: ${upsertError.message}`,
    });
  }

  return redirectHome(request, { strava_connected: "true" });
}
