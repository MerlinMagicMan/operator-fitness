import type { MealType } from "@/lib/operator-types";

export const MEAL_TYPES: readonly MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
] as const;

export const MEAL_TYPE_LABEL: Record<MealType, string> = {
  breakfast: "BREAKFAST",
  lunch: "LUNCH",
  dinner: "DINNER",
  snack: "SNACK",
};

/** Heuristic mapping from local hour (0-23) to a meal type. */
export function suggestMealType(hour: number): MealType {
  if (hour < 5) return "snack";
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 17) return "snack";
  if (hour < 22) return "dinner";
  return "snack";
}

/** Suggest meal type from a Date in the browser's local timezone. */
export function suggestMealTypeForDate(d: Date = new Date()): MealType {
  return suggestMealType(d.getHours());
}

/** "HH:MM" in the browser's local timezone, suitable for <input type="time">. */
export function localTimeHHMM(d: Date = new Date()): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Combine a YYYY-MM-DD date with a HH:MM time and return an ISO string
 * representing that local wall-clock time. The returned string includes
 * a timezone offset so Postgres timestamptz parses it correctly.
 */
export function combineDateAndTime(
  date: string,
  timeHHMM: string,
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!/^\d{2}:\d{2}$/.test(timeHHMM)) return null;
  const [hStr, mStr] = timeHHMM.split(":");
  const [yStr, moStr, dStr] = date.split("-");
  const local = new Date(
    Number(yStr),
    Number(moStr) - 1,
    Number(dStr),
    Number(hStr),
    Number(mStr),
    0,
    0,
  );
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

/** Render an ISO timestamp as e.g. "8:30 AM" in the browser's local TZ. */
export function formatTimeOfDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
