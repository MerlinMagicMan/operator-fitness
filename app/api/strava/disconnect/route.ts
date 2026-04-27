import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Disconnect Strava: delete the user's oauth_tokens row for the strava
 * provider. Activities already imported stay in the activities table.
 * 303 redirect back to "/" with a status flag so the form-action UX
 * lands the user back on the dashboard.
 */
export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { error } = await supabase
    .from("oauth_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", "strava");

  const url = new URL("/", request.url);
  if (error) {
    url.searchParams.set("strava_error", `disconnect_failed: ${error.message}`);
  } else {
    url.searchParams.set("strava_disconnected", "true");
  }
  return NextResponse.redirect(url, 303);
}
