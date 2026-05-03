"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { localDateISO } from "@/lib/date";
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

  const { data: profile } = await supabase
    .from("profile")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();
  const today = localDateISO(
    (profile as { timezone: string | null } | null)?.timezone ?? null,
  );
  // Upsert (not update) so brand-new accounts whose profile row hasn't
  // been materialized yet by the on-auth trigger still get a row with
  // program_start_date set. PostgREST upsert only writes the columns
  // we specify, so display_name/phase/weight_goal_lb stay untouched.
  const { error } = await supabase
    .from("profile")
    .upsert({ id: user.id, program_start_date: today }, { onConflict: "id" });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

/** Void-returning adapter for direct invocation from client components. */
export async function resetProgramStartForm(): Promise<void> {
  const result = await resetProgramStart();
  if ("error" in result) throw new Error(result.error);
}
