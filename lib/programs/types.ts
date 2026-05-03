/**
 * Shared shapes for the Programs feature.
 *
 * Two kinds of types live here:
 *
 *   1. Row types that mirror the supabase tables in migration 0004.
 *   2. The structural JSON schema used for `program_sessions.blocks`
 *      and for seed files in `supabase/seeds/programs/*.json`. The
 *      same shape is emitted by the AI program generator.
 */

export type ProgramArchetype =
  | "bodyweight_mobility"
  | "banded_mobility"
  | "loaded_mobility"
  | "advanced_loaded_mobility"
  | "bodyweight_conditioning"
  | "dynamic_strength"
  | "functional_sc"
  | "custom";

export type ProgramSource = "manual" | "transcribed" | "ai_generated";

export type EnrollmentStatus = "active" | "paused" | "completed" | "abandoned";

export type BlockType =
  | "warmup"
  | "mobility"
  | "strength"
  | "capacity"
  | "cooldown";

/**
 * A single prescribed movement inside a block. Every numeric field is
 * optional because programs mix rep-based, time-based, and load-based
 * prescriptions freely. Keep `name` human-readable; the AI generator
 * and the manual transcriber should agree on movement naming.
 */
export type BlockItem = {
  name: string;
  sets?: number | null;
  reps?: number | null;
  duration_s?: number | null;
  /** e.g. "3-1-3" or "slow eccentric" */
  tempo?: string | null;
  rpe?: number | null;
  /** Free-form load (e.g. "24kg KB", "BW", "60% 1RM"). */
  load?: string | null;
  notes?: string | null;
};

/**
 * Lettered block (A, B1, C, etc.) inside a session. Multiple items in
 * one block render as a superset / circuit; a single item renders as a
 * straight set. `name` is optional - if absent, the UI falls back to
 * the label.
 */
export type SessionBlock = {
  label: string;
  type: BlockType;
  name?: string | null;
  items: BlockItem[];
  notes?: string | null;
};

/**
 * Row shape returned by `select * from program_sessions`. `blocks` is
 * stored as jsonb; cast to `SessionBlock[]` after fetch.
 */
export type ProgramSessionRow = {
  id: string;
  program_id: string;
  week: number;
  day_of_week: number;
  title: string | null;
  est_minutes: number | null;
  blocks: SessionBlock[];
  notes: string | null;
  created_at: string;
};

export type ProgramRow = {
  id: string;
  owner_user_id: string | null;
  name: string;
  slug: string | null;
  description: string | null;
  archetype: ProgramArchetype;
  focus_areas: string[];
  equipment: string[];
  weeks: number;
  days_per_week: number;
  session_minutes_avg: number | null;
  source: ProgramSource;
  ai_brief: ProgramAIBrief | null;
  created_at: string;
  updated_at: string;
};

export type ProgramEnrollmentRow = {
  id: string;
  user_id: string;
  program_id: string;
  started_on: string;
  current_week: number;
  status: EnrollmentStatus;
  is_overlay: boolean;
  created_at: string;
  updated_at: string;
};

export type SessionCompletionRow = {
  id: string;
  enrollment_id: string;
  week: number;
  day_of_week: number;
  completed_at: string;
  rpe: number | null;
  notes: string | null;
  /** { [blockLabel]: { [itemIndex]: boolean } } */
  block_state: Record<string, Record<string, boolean>>;
};

/**
 * The brief handed to the Coach when generating a new program. Stored
 * on `programs.ai_brief` so we can re-run / iterate.
 */
export type ProgramAIBrief = {
  archetype: ProgramArchetype;
  weeks: number;
  days_per_week: number;
  session_minutes_target?: number;
  equipment: string[];
  focus_areas: string[];
  /** Free-form additional context, e.g. "left knee tweaky, avoid deep flexion". */
  constraints?: string;
};

// =====================================================================
// Seed file format
// =====================================================================
// Files in supabase/seeds/programs/*.json conform to this shape. The
// loader reads each file, upserts a `programs` row keyed by slug, and
// then upserts every session into `program_sessions`.
// =====================================================================

export type ProgramSeed = {
  slug: string;
  name: string;
  description?: string;
  archetype: ProgramArchetype;
  focus_areas: string[];
  equipment: string[];
  weeks: number;
  days_per_week: number;
  session_minutes_avg?: number;
  source: ProgramSource;
  sessions: ProgramSeedSession[];
};

export type ProgramSeedSession = {
  week: number;
  day_of_week: number;
  title?: string;
  est_minutes?: number;
  blocks: SessionBlock[];
  notes?: string;
};
