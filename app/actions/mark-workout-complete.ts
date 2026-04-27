"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/operator-types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Upsert today's (or any given date's) workout completion to true.
 * Form-action signature so it can be wired straight to a `<form action>`.
 */
export async function markWorkoutComplete(
  formData: FormData,
): Promise<ActionResult> {
  const rawDate = formData.get("date");
  const date = typeof rawDate === "string" ? rawDate : "";
  if (!ISO_DATE_RE.test(date)) {
    return { error: "Invalid date" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("workouts_completed").upsert(
    {
      user_id: user.id,
      date,
      completed: true,
    },
    { onConflict: "user_id,date" },
  );

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

/**
 * Void-returning adapter for `<form action={...}>` usage. Next's form
 * action prop requires Promise<void>; this wraps markWorkoutComplete and
 * surfaces failures via the error overlay.
 */
export async function markWorkoutCompleteForm(
  formData: FormData,
): Promise<void> {
  const result = await markWorkoutComplete(formData);
  if ("error" in result) {
    throw new Error(result.error);
  }
}
