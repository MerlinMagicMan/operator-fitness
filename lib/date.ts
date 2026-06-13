/**
 * Date helpers that respect a wall-clock timezone instead of UTC.
 *
 * `new Date().toISOString().slice(0, 10)` returns UTC, which is a day off
 * for any entry made late evening in negative-offset zones (e.g. a 7pm
 * dinner in America/Chicago is past midnight UTC, so it would land on
 * "tomorrow's" calendar date).
 */

const DEFAULT_TZ = "America/Chicago";

/**
 * Today's date as YYYY-MM-DD in the given IANA timezone. Defaults to
 * the operator's home timezone (America/Chicago) when not supplied.
 */
export function localDateISO(
  timezone: string | null | undefined = DEFAULT_TZ,
  at: Date = new Date(),
): string {
  const tz = timezone ?? DEFAULT_TZ;
  // en-CA's date format is natively YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/**
 * Shift a YYYY-MM-DD calendar date by a whole number of days. Anchored at
 * UTC noon so daylight-saving transitions can't push the result onto the
 * wrong calendar day. Returns a YYYY-MM-DD string.
 */
export function shiftISODate(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const base = Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12);
  return new Date(base + deltaDays * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Friendly label for a calendar date relative to "today": "TODAY",
 * "YESTERDAY", or the weekday (e.g. "MONDAY"). Older than a week falls
 * back to the raw ISO date.
 */
export function relativeDayLabel(iso: string, todayISO: string): string {
  if (iso === todayISO) return "TODAY";
  if (iso === shiftISODate(todayISO, -1)) return "YESTERDAY";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12));
  const diffDays = Math.round(
    (Date.parse(`${todayISO}T12:00:00Z`) - date.getTime()) / 86_400_000,
  );
  if (diffDays > 1 && diffDays < 7) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "UTC",
    })
      .format(date)
      .toUpperCase();
  }
  return iso;
}
