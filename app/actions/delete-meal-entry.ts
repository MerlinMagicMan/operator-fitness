"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/operator-types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Delete a single diet_log row by id. RLS handles ownership.
 */
export async function deleteMealEntry(
  formData: FormData,
): Promise<ActionResult> {
  const id = formData.get("id");
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    return { error: "Invalid id" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("diet_log")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

/** Form-action adapter (returns void). */
export async function deleteMealEntryForm(formData: FormData): Promise<void> {
  const result = await deleteMealEntry(formData);
  if ("error" in result) throw new Error(result.error);
}
