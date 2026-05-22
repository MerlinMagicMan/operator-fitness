"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, ProfileRow } from "@/lib/operator-types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NOTES_LEN = 4000;
const MAX_LABEL_LEN = 64;

type Phase = "foundation" | "recomp" | "performance";
const PHASES = new Set<Phase>(["foundation", "recomp", "performance"]);

/** Shape accepted by the coach tool and the JSON endpoint. Every field
 *  is optional — only keys present in the input get written. Setting a
 *  field to null explicitly clears it. */
export type ProfileUpdate = {
  display_name?: string | null;
  timezone?: string | null;
  phase?: Phase | null;
  weight_goal_lb?: number | null;
  bf_goal_pct?: number | null;
  program_start_date?: string | null;
  age_years?: number | null;
  height_inches?: number | null;
  start_weight_lb?: number | null;
  activity_multiplier?: number | null;
  cut_deficit_kcal?: number | null;
  diet_style?: string | null;
  protein_g_per_lb?: number | null;
  fat_pct_of_calories?: number | null;
  net_carbs_max_g?: number | null;
  diet_notes?: string | null;
  goals_notes?: string | null;
};

type Validated = Partial<ProfileRow>;

function clampNum(
  value: unknown,
  { min, max, integer }: { min: number; max: number; integer?: boolean },
): number | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const n = typeof value === "string" ? Number(value.trim()) : Number(value);
  if (!Number.isFinite(n)) return undefined;
  if (n < min || n > max) return undefined;
  return integer ? Math.round(n) : n;
}

function trimText(value: unknown, max: number): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  if (t === "") return null;
  return t.length > max ? t.slice(0, max) : t;
}

function validateUpdate(raw: ProfileUpdate): {
  patch: Validated;
  applied: string[];
  rejected: string[];
} {
  const patch: Validated = {};
  const applied: string[] = [];
  const rejected: string[] = [];

  const apply = (key: keyof ProfileRow, value: unknown) => {
    if (value === undefined) {
      rejected.push(key);
      return;
    }
    // SAFETY: each branch narrows to the column's underlying type.
    (patch as Record<string, unknown>)[key] = value;
    applied.push(key);
  };

  if ("display_name" in raw) {
    apply("display_name", trimText(raw.display_name, MAX_LABEL_LEN));
  }
  if ("timezone" in raw) {
    apply("timezone", trimText(raw.timezone, MAX_LABEL_LEN));
  }
  if ("phase" in raw) {
    if (raw.phase === null) apply("phase", null);
    else if (typeof raw.phase === "string" && PHASES.has(raw.phase as Phase)) {
      apply("phase", raw.phase);
    } else rejected.push("phase");
  }
  if ("weight_goal_lb" in raw) {
    apply(
      "weight_goal_lb",
      clampNum(raw.weight_goal_lb, { min: 60, max: 700 }),
    );
  }
  if ("bf_goal_pct" in raw) {
    apply("bf_goal_pct", clampNum(raw.bf_goal_pct, { min: 3, max: 60 }));
  }
  if ("program_start_date" in raw) {
    if (raw.program_start_date === null) apply("program_start_date", null);
    else if (
      typeof raw.program_start_date === "string" &&
      ISO_DATE_RE.test(raw.program_start_date)
    ) {
      apply("program_start_date", raw.program_start_date);
    } else rejected.push("program_start_date");
  }
  if ("age_years" in raw) {
    apply(
      "age_years",
      clampNum(raw.age_years, { min: 12, max: 110, integer: true }),
    );
  }
  if ("height_inches" in raw) {
    apply("height_inches", clampNum(raw.height_inches, { min: 36, max: 96 }));
  }
  if ("start_weight_lb" in raw) {
    apply(
      "start_weight_lb",
      clampNum(raw.start_weight_lb, { min: 60, max: 700 }),
    );
  }
  if ("activity_multiplier" in raw) {
    apply(
      "activity_multiplier",
      clampNum(raw.activity_multiplier, { min: 1.0, max: 2.5 }),
    );
  }
  if ("cut_deficit_kcal" in raw) {
    apply(
      "cut_deficit_kcal",
      clampNum(raw.cut_deficit_kcal, {
        min: -1500,
        max: 1500,
        integer: true,
      }),
    );
  }
  if ("diet_style" in raw) {
    apply("diet_style", trimText(raw.diet_style, MAX_LABEL_LEN));
  }
  if ("protein_g_per_lb" in raw) {
    apply(
      "protein_g_per_lb",
      clampNum(raw.protein_g_per_lb, { min: 0.2, max: 2.0 }),
    );
  }
  if ("fat_pct_of_calories" in raw) {
    apply(
      "fat_pct_of_calories",
      clampNum(raw.fat_pct_of_calories, { min: 0.05, max: 0.95 }),
    );
  }
  if ("net_carbs_max_g" in raw) {
    apply(
      "net_carbs_max_g",
      clampNum(raw.net_carbs_max_g, { min: 0, max: 800, integer: true }),
    );
  }
  if ("diet_notes" in raw) {
    apply("diet_notes", trimText(raw.diet_notes, MAX_NOTES_LEN));
  }
  if ("goals_notes" in raw) {
    apply("goals_notes", trimText(raw.goals_notes, MAX_NOTES_LEN));
  }

  return { patch, applied, rejected };
}

/**
 * Upsert one or more columns on the user's profile. Only fields present
 * in `update` are written; pass null to clear a field. Used by both the
 * Profile panel form and the coach `update_profile` tool.
 */
export async function updateProfile(
  update: ProfileUpdate,
): Promise<ActionResult & { applied?: string[]; rejected?: string[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { patch, applied, rejected } = validateUpdate(update);
  if (applied.length === 0) {
    return { error: "No valid fields supplied", rejected };
  }

  const { error } = await supabase
    .from("profile")
    .upsert({ id: user.id, ...patch }, { onConflict: "id" });
  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true, applied, rejected };
}

/** FormData adapter for the Profile panel. */
export async function updateProfileForm(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const update: ProfileUpdate = {};
  const text = (key: string): string | null | undefined => {
    if (!formData.has(key)) return undefined;
    const v = formData.get(key);
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t === "" ? null : t;
  };
  const num = (key: string): number | null | undefined => {
    const t = text(key);
    if (t === undefined) return undefined;
    if (t === null) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  };

  const dn = text("display_name");
  if (dn !== undefined) update.display_name = dn;
  const tz = text("timezone");
  if (tz !== undefined) update.timezone = tz;
  const ds = text("diet_style");
  if (ds !== undefined) update.diet_style = ds;
  const notes = text("diet_notes");
  if (notes !== undefined) update.diet_notes = notes;
  const goals = text("goals_notes");
  if (goals !== undefined) update.goals_notes = goals;

  for (const key of [
    "weight_goal_lb",
    "bf_goal_pct",
    "age_years",
    "height_inches",
    "start_weight_lb",
    "activity_multiplier",
    "cut_deficit_kcal",
    "protein_g_per_lb",
    "fat_pct_of_calories",
    "net_carbs_max_g",
  ] as const) {
    const n = num(key);
    if (n !== undefined) {
      (update as Record<string, unknown>)[key] = n;
    }
  }

  return updateProfile(update);
}
