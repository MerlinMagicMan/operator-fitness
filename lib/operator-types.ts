/**
 * Row shapes for the OPERATOR Supabase tables. These mirror the columns
 * declared in supabase/schema.sql. Numeric columns come back from the
 * Supabase client typed as `number | null`; date columns are ISO strings.
 */

export type ProfileRow = {
  id: string;
  display_name: string | null;
  timezone: string | null;
  phase: "foundation" | "recomp" | "performance" | null;
  weight_goal_lb: number | null;
  bf_goal_pct: number | null;
  /** Anchor date for phase / week / day calculations (YYYY-MM-DD).
   *  Falls back to created_at if NULL. Reset via resetProgramStart. */
  program_start_date: string | null;
  created_at: string;
  updated_at: string;
};

export type BodyMetricRow = {
  id: string;
  user_id: string;
  date: string;
  weight_lb: number | null;
  bf_pct: number | null;
  muscle_mass_lb: number | null;
  water_pct: number | null;
  waist_inches: number | null;
  sleep_hours: number | null;
  notes: string | null;
  created_at: string;
};

export type WorkoutCompletedRow = {
  user_id: string;
  date: string;
  completed: boolean;
  manual_override: boolean;
  override_reason: string | null;
  notes: string | null;
  updated_at: string;
};

export type MealSource = "usda" | "estimate" | "manual";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type DietLogRow = {
  id: string;
  user_id: string;
  date: string;
  meal: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  source: MealSource | null;
  fdc_id: string | null;
  meal_type: MealType | null;
  eaten_at: string | null;
  created_at: string;
};

/** One row returned by the parse pipeline (Claude + USDA tool-use). */
export type ParsedMealItem = {
  name: string;
  qty_text: string;
  grams: number | null;
  kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  source: MealSource;
  fdc_id: string | null;
};

/** Input shape for inserting one diet_log row programmatically. */
export type MealInput = {
  date: string;
  meal: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  source: MealSource;
  fdc_id: string | null;
  meal_type: MealType | null;
  eaten_at: string | null;
};

export type ActivityRow = {
  id: string;
  user_id: string;
  source: "strava" | "withings" | "manual" | "garmin" | "apple" | "whoop";
  external_id: string | null;
  sport: string | null;
  date: string;
  started_at: string | null;
  duration_s: number | null;
  distance_m: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  calories: number | null;
  notes: string | null;
  raw: unknown;
  created_at: string;
};

export type OAuthProvider = "strava" | "withings" | "garmin" | "suunto";

export type OAuthTokenRow = {
  user_id: string;
  provider: OAuthProvider;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  scope: string | null;
  athlete_id: string | null;
  raw: unknown;
  created_at: string;
  updated_at: string;
};

export type ActionResult = { success: true } | { error: string };
