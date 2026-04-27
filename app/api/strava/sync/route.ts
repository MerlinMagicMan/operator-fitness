import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  expiresAtToISO,
  fetchActivities,
  isoToUnixSeconds,
  refreshAccessToken,
  type StravaActivity,
} from "@/lib/strava";
import type { OAuthTokenRow } from "@/lib/operator-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;
const PER_PAGE = 30;

type PerUserResult = {
  user_id: string;
  synced: number;
  refreshed: boolean;
  error?: string;
};

function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function activityToRow(
  userId: string,
  a: StravaActivity,
): {
  user_id: string;
  source: "strava";
  external_id: string;
  sport: string | null;
  date: string;
  started_at: string;
  duration_s: number | null;
  distance_m: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  calories: number | null;
  notes: string | null;
  raw: StravaActivity;
} {
  return {
    user_id: userId,
    source: "strava",
    external_id: String(a.id),
    sport: a.sport_type ?? a.type ?? null,
    date: a.start_date_local.slice(0, 10),
    started_at: a.start_date,
    duration_s: a.elapsed_time ?? null,
    distance_m: a.distance ?? null,
    avg_hr: a.average_heartrate ?? null,
    max_hr: a.max_heartrate ?? null,
    calories: a.calories ?? null,
    notes: a.name,
    raw: a,
  };
}

async function syncOneUser(
  admin: SupabaseClient,
  token: OAuthTokenRow,
): Promise<{ synced: number; refreshed: boolean }> {
  let accessToken = token.access_token;
  let refreshed = false;

  // Refresh if the access token expires within REFRESH_THRESHOLD_MS.
  const expiresMs = token.expires_at ? new Date(token.expires_at).getTime() : 0;
  if (token.refresh_token && expiresMs - Date.now() < REFRESH_THRESHOLD_MS) {
    const fresh = await refreshAccessToken(token.refresh_token);
    accessToken = fresh.access_token;
    refreshed = true;
    const { error: updErr } = await admin
      .from("oauth_tokens")
      .update({
        access_token: fresh.access_token,
        refresh_token: fresh.refresh_token,
        expires_at: expiresAtToISO(fresh.expires_at),
        raw: fresh,
      })
      .eq("user_id", token.user_id)
      .eq("provider", "strava");
    if (updErr) {
      throw new Error(`token update failed: ${updErr.message}`);
    }
  }

  // Last synced activity → use as Strava `after` cutoff (unix seconds).
  const { data: last } = await admin
    .from("activities")
    .select("started_at")
    .eq("user_id", token.user_id)
    .eq("source", "strava")
    .not("started_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastStartedAt = (last as { started_at: string | null } | null)
    ?.started_at;
  const after = lastStartedAt ? isoToUnixSeconds(lastStartedAt) : undefined;

  const activities = await fetchActivities({
    accessToken,
    after,
    perPage: PER_PAGE,
  });
  if (activities.length === 0) {
    return { synced: 0, refreshed };
  }

  const rows = activities.map((a) => activityToRow(token.user_id, a));
  const { error: upsertError } = await admin.from("activities").upsert(rows, {
    onConflict: "user_id,source,external_id",
  });
  if (upsertError) {
    throw new Error(`activities upsert failed: ${upsertError.message}`);
  }

  return { synced: rows.length, refreshed };
}

/**
 * Vercel cron entrypoint. Authenticates via CRON_SECRET, loops over
 * every user with a Strava OAuth token, refreshes if expiring, and
 * upserts new activities into the activities table. Per-user errors
 * are caught so one bad token doesn't break the whole batch.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isCronAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "admin client init failed";
    return new Response(msg, { status: 503 });
  }

  const { data: tokens, error: tokensError } = await admin
    .from("oauth_tokens")
    .select("*")
    .eq("provider", "strava");

  if (tokensError) {
    return new Response(`tokens query failed: ${tokensError.message}`, {
      status: 500,
    });
  }

  const tokenRows = (tokens as OAuthTokenRow[] | null) ?? [];
  const results: PerUserResult[] = [];

  for (const token of tokenRows) {
    try {
      const { synced, refreshed } = await syncOneUser(admin, token);
      results.push({ user_id: token.user_id, synced, refreshed });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        user_id: token.user_id,
        synced: 0,
        refreshed: false,
        error: msg,
      });
    }
  }

  const totalSynced = results.reduce((acc, r) => acc + r.synced, 0);

  return Response.json({
    success: true,
    users: results.length,
    synced: totalSynced,
    results,
  });
}
