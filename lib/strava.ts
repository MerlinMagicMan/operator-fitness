/**
 * Pure helpers for the Strava integration. Used by the OAuth route
 * handlers (connect/callback/sync) and the background sync cron.
 *
 * Reads STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET / STRAVA_REDIRECT_URI
 * from process.env at call time so missing-env failures surface as
 * thrown errors instead of cached module-load crashes.
 */

export const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
export const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
export const STRAVA_API_BASE = "https://www.strava.com/api/v3";

export const STRAVA_OAUTH_SCOPES = "read,activity:read_all,profile:read_all";

/** Subset of Strava's token response that we actually use. */
export type StravaTokenResponse = {
  token_type: string;
  access_token: string;
  refresh_token: string;
  /** Unix epoch seconds when the access token expires. */
  expires_at: number;
  /** Seconds from now until the access token expires. */
  expires_in: number;
  /** Returned by the initial code exchange; absent on refresh. */
  athlete?: {
    id: number;
    firstname?: string;
    lastname?: string;
    username?: string | null;
  };
  /** Returned by the initial code exchange. */
  scope?: string;
};

/** Subset of Strava's Activity object that maps to our activities table. */
export type StravaActivity = {
  id: number;
  name: string;
  type?: string;
  sport_type?: string;
  start_date: string;
  start_date_local: string;
  elapsed_time?: number;
  moving_time?: number;
  distance?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
  has_heartrate?: boolean;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

/** Build the Strava authorize URL the user gets redirected to. */
export function buildAuthorizeUrl(state: string): string {
  const clientId = requireEnv("STRAVA_CLIENT_ID");
  const redirectUri = requireEnv("STRAVA_REDIRECT_URI");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: STRAVA_OAUTH_SCOPES,
    state,
  });
  return `${STRAVA_AUTHORIZE_URL}?${params.toString()}`;
}

/** Exchange the authorization code from /callback for tokens. */
export async function exchangeCodeForTokens(
  code: string,
): Promise<StravaTokenResponse> {
  const clientId = requireEnv("STRAVA_CLIENT_ID");
  const clientSecret = requireEnv("STRAVA_CLIENT_SECRET");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
  });

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Strava token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as StravaTokenResponse;
}

/** Trade a refresh token for a fresh access token. */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<StravaTokenResponse> {
  const clientId = requireEnv("STRAVA_CLIENT_ID");
  const clientSecret = requireEnv("STRAVA_CLIENT_SECRET");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Strava token refresh failed (${res.status}): ${text}`);
  }
  return (await res.json()) as StravaTokenResponse;
}

/**
 * Fetch the athlete's activities, newest-first. Pass `after` (unix
 * seconds) to limit results to ones that started after that time.
 */
export async function fetchActivities({
  accessToken,
  after,
  perPage = 30,
}: {
  accessToken: string;
  after?: number;
  perPage?: number;
}): Promise<StravaActivity[]> {
  const params = new URLSearchParams({ per_page: String(perPage) });
  if (after != null && after > 0) {
    params.set("after", String(after));
  }

  const res = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Strava activities fetch failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data as StravaActivity[];
}

/** Convert a Strava unix-seconds expiry to an ISO timestamp for Postgres. */
export function expiresAtToISO(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

/** Convert an ISO timestamp back to unix-seconds for Strava's `after` param. */
export function isoToUnixSeconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}
