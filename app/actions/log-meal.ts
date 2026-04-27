"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/operator-types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_MEAL_LEN = 200;

function num(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Insert one diet_log row for the given date. useActionState-compatible
 * so the modal can render inline errors.
 */
export async function logMeal(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const date = formData.get("date");
  if (typeof date !== "string" || !ISO_DATE_RE.test(date)) {
    return { error: "Date must be YYYY-MM-DD" };
  }

  const meal = formData.get("meal");
  const mealStr = typeof meal === "string" ? meal.trim() : "";
  if (mealStr === "" || mealStr.length > MAX_MEAL_LEN) {
    return { error: "Meal name is required" };
  }

  const calories = num(formData.get("calories"));
  const protein = num(formData.get("protein_g"));
  const carbs = num(formData.get("carbs_g"));
  const fat = num(formData.get("fat_g"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("diet_log").insert({
    user_id: user.id,
    date,
    meal: mealStr,
    calories: calories != null ? Math.round(calories) : null,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}
