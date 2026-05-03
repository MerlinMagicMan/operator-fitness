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
