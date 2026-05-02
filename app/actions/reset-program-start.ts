"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/operator-types";

/**
 * Set the user's program_start_date to today, re-zeroing the
 * dashboard's phase / week / day counters. Workouts already marked
 * complete stay in workouts_completed — this only moves the anchor.
 */
export async function resetProgramStart(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("profile")
    .update({ program_start_date: today })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

/** Void-returning adapter for direct invocation from client components. */
export async function resetProgramStartForm(): Promise<void> {
  const result = await resetProgramStart();
  if ("error" in result) throw new Error(result.error);
}
