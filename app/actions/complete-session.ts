"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/operator-types";

export async function completeSession(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const enrollmentId = formData.get("enrollment_id");
  const weekStr = formData.get("week");
  const dayStr = formData.get("day_of_week");
  const rpeStr = formData.get("rpe");
  const notes = formData.get("notes");
  const blockStateStr = formData.get("block_state");

  if (typeof enrollmentId !== "string" || !enrollmentId) {
    return { error: "enrollment_id is required" };
  }
  const week = typeof weekStr === "string" ? parseInt(weekStr, 10) : NaN;
  const dayOfWeek = typeof dayStr === "string" ? parseInt(dayStr, 10) : NaN;
  if (!Number.isInteger(week) || week < 1) {
    return { error: "week must be a positive integer" };
  }
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
    return { error: "day_of_week must be 1-7" };
  }

  let rpe: number | null = null;
  if (typeof rpeStr === "string" && rpeStr.trim() !== "") {
    const n = Number(rpeStr);
    if (!Number.isFinite(n) || n < 0 || n > 10) {
      return { error: "rpe must be between 0 and 10" };
    }
    rpe = n;
  }

  let blockState: Record<string, Record<string, boolean>> = {};
  if (typeof blockStateStr === "string" && blockStateStr.trim() !== "") {
    try {
      const parsed = JSON.parse(blockStateStr);
      if (parsed && typeof parsed === "object") {
        blockState = parsed;
      }
    } catch {
      return { error: "block_state must be valid JSON" };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: enrollment } = await supabase
    .from("program_enrollments")
    .select("id")
    .eq("id", enrollmentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!enrollment) return { error: "Enrollment not found" };

  const { error } = await supabase.from("session_completions").upsert(
    {
      enrollment_id: enrollmentId,
      week,
      day_of_week: dayOfWeek,
      rpe,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      block_state: blockState,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "enrollment_id,week,day_of_week" },
  );

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}
