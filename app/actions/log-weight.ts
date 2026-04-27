"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/operator-types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function num(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function str(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Upsert one body_metrics row for the given date. Composite key
 * (user_id, date) ensures one row per day. useActionState-compatible
 * signature so a client modal can render inline errors.
 */
export async function logWeight(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const date = str(formData.get("date")) ?? "";
  if (!ISO_DATE_RE.test(date)) {
    return { error: "Date must be YYYY-MM-DD" };
  }

  const weightLb = num(formData.get("weight_lb"));
  if (weightLb == null || weightLb <= 0) {
    return { error: "Weight is required" };
  }

  const bfPct = num(formData.get("bf_pct"));
  const waistInches = num(formData.get("waist_inches"));
  const sleepHours = num(formData.get("sleep_hours"));
  const notes = str(formData.get("notes"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("body_metrics").upsert(
    {
      user_id: user.id,
      date,
      weight_lb: weightLb,
      bf_pct: bfPct,
      waist_inches: waistInches,
      sleep_hours: sleepHours,
      notes,
    },
    { onConflict: "user_id,date" },
  );

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}
