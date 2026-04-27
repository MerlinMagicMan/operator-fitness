"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/operator-types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ManualActivityInput = {
  external_id: string;
  sport: string | null;
  date: string;
  duration_s: number | null;
  distance_m: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  calories: number | null;
};

function clampNonNegative(n: number | null): number | null {
  if (n == null || !Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Insert one or more manually-imported activities. Used by the IMPORT
 * tab once GPX/TCX/CSV parsing is wired in phase 2C — the Strava sync
 * lands separately. Uses the (user_id, source, external_id) unique
 * constraint so re-importing the same file doesn't duplicate rows.
 */
export async function importManualActivities(
  records: ManualActivityInput[],
): Promise<ActionResult & { imported?: number }> {
  if (!Array.isArray(records) || records.length === 0) {
    return { error: "No activities to import" };
  }
  if (records.length > 200) {
    return { error: "Too many activities (max 200 per request)" };
  }

  for (const r of records) {
    if (typeof r.external_id !== "string" || r.external_id.length === 0) {
      return { error: "Each activity needs an external_id" };
    }
    if (typeof r.date !== "string" || !ISO_DATE_RE.test(r.date)) {
      return { error: `Invalid date for ${r.external_id}` };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const rows = records.map((r) => ({
    user_id: user.id,
    source: "manual" as const,
    external_id: r.external_id,
    sport: r.sport,
    date: r.date,
    duration_s: clampNonNegative(r.duration_s),
    distance_m: clampNonNegative(r.distance_m),
    avg_hr: clampNonNegative(r.avg_hr),
    max_hr: clampNonNegative(r.max_hr),
    calories: clampNonNegative(r.calories),
  }));

  const { error, count } = await supabase.from("activities").upsert(rows, {
    onConflict: "user_id,source,external_id",
    count: "exact",
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true, imported: count ?? rows.length };
}
