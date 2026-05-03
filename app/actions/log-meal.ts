"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, MealInput, MealType } from "@/lib/operator-types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MEAL_TYPES = new Set<MealType>(["breakfast", "lunch", "dinner", "snack"]);
const MAX_MEAL_LEN = 200;
const MAX_BULK_ROWS = 20;

function isValidMealType(v: unknown): v is MealType {
  return typeof v === "string" && MEAL_TYPES.has(v as MealType);
}

function isValidIsoTimestamp(v: unknown): v is string {
  if (typeof v !== "string" || v === "") return false;
  const t = Date.parse(v);
  return Number.isFinite(t);
}

function num(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function sanitizeMeal(input: MealInput): MealInput | { error: string } {
  if (!ISO_DATE_RE.test(input.date))
    return { error: "Date must be YYYY-MM-DD" };
  const meal = input.meal.trim();
  if (meal === "" || meal.length > MAX_MEAL_LEN) {
    return { error: "Meal name is required" };
  }
  const source =
    input.source === "usda" || input.source === "estimate"
      ? input.source
      : "manual";
  return {
    date: input.date,
    meal,
    calories:
      input.calories != null && input.calories >= 0
        ? Math.round(input.calories)
        : null,
    protein_g:
      input.protein_g != null && input.protein_g >= 0 ? input.protein_g : null,
    carbs_g: input.carbs_g != null && input.carbs_g >= 0 ? input.carbs_g : null,
    fat_g: input.fat_g != null && input.fat_g >= 0 ? input.fat_g : null,
    source,
    fdc_id: source === "usda" && input.fdc_id ? input.fdc_id : null,
    meal_type: isValidMealType(input.meal_type) ? input.meal_type : null,
    eaten_at: isValidIsoTimestamp(input.eaten_at) ? input.eaten_at : null,
  };
}

/**
 * Insert one diet_log row from form data. useActionState-compatible
 * so the manual modal form can render inline errors.
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const mealTypeRaw = formData.get("meal_type");
  const meal_type = isValidMealType(mealTypeRaw) ? mealTypeRaw : null;
  const eatenAtRaw = formData.get("eaten_at");
  const eaten_at = isValidIsoTimestamp(eatenAtRaw) ? eatenAtRaw : null;

  const { error } = await supabase.from("diet_log").insert({
    user_id: user.id,
    date,
    meal: mealStr,
    calories: (() => {
      const c = num(formData.get("calories"));
      return c != null ? Math.round(c) : null;
    })(),
    protein_g: num(formData.get("protein_g")),
    carbs_g: num(formData.get("carbs_g")),
    fat_g: num(formData.get("fat_g")),
    source: "manual",
    fdc_id: null,
    meal_type,
    eaten_at,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

/**
 * Bulk insert from the parsed-meal pipeline (QuickLogMeal + coach
 * tool-use). Each row carries its own source flag so the UI can render
 * the VERIFIED / ESTIMATE badges.
 */
export async function logMeals(
  items: MealInput[],
): Promise<ActionResult & { count?: number }> {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "No meals provided" };
  }
  if (items.length > MAX_BULK_ROWS) {
    return { error: `Too many rows (max ${MAX_BULK_ROWS})` };
  }

  const sanitized: MealInput[] = [];
  for (const item of items) {
    const out = sanitizeMeal(item);
    if ("error" in out) return out;
    sanitized.push(out);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("diet_log").insert(
    sanitized.map((m) => ({
      user_id: user.id,
      date: m.date,
      meal: m.meal,
      calories: m.calories,
      protein_g: m.protein_g,
      carbs_g: m.carbs_g,
      fat_g: m.fat_g,
      source: m.source,
      fdc_id: m.fdc_id,
      meal_type: m.meal_type,
      eaten_at: m.eaten_at,
    })),
  );

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true, count: sanitized.length };
}
