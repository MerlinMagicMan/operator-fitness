import { createClient } from "@/lib/supabase/server";
import { generateProgramSeed } from "@/lib/programs/generator";
import { insertProgramSeed } from "@/lib/programs/insert-seed";
import type { ProgramAIBrief, ProgramArchetype } from "@/lib/programs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ARCHETYPES: readonly ProgramArchetype[] = [
  "bodyweight_mobility",
  "banded_mobility",
  "loaded_mobility",
  "advanced_loaded_mobility",
  "bodyweight_conditioning",
  "dynamic_strength",
  "functional_sc",
  "custom",
];

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function validateBrief(body: unknown): ProgramAIBrief | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Body must be a JSON object" };
  }
  const o = body as Record<string, unknown>;

  if (
    typeof o.archetype !== "string" ||
    !VALID_ARCHETYPES.includes(o.archetype as ProgramArchetype)
  ) {
    return {
      error: `archetype must be one of: ${VALID_ARCHETYPES.join(", ")}`,
    };
  }
  if (
    typeof o.weeks !== "number" ||
    !Number.isInteger(o.weeks) ||
    o.weeks < 1 ||
    o.weeks > 12
  ) {
    return { error: "weeks must be an integer between 1 and 12" };
  }
  if (
    typeof o.days_per_week !== "number" ||
    !Number.isInteger(o.days_per_week) ||
    o.days_per_week < 1 ||
    o.days_per_week > 7
  ) {
    return { error: "days_per_week must be an integer between 1 and 7" };
  }
  if (!isStringArray(o.equipment)) {
    return { error: "equipment must be an array of strings" };
  }
  if (!isStringArray(o.focus_areas)) {
    return { error: "focus_areas must be an array of strings" };
  }
  if (
    o.session_minutes_target !== undefined &&
    (typeof o.session_minutes_target !== "number" ||
      !Number.isInteger(o.session_minutes_target) ||
      o.session_minutes_target < 5 ||
      o.session_minutes_target > 240)
  ) {
    return {
      error: "session_minutes_target must be an integer between 5 and 240",
    };
  }
  if (o.constraints !== undefined && typeof o.constraints !== "string") {
    return { error: "constraints must be a string" };
  }

  return {
    archetype: o.archetype as ProgramArchetype,
    weeks: o.weeks,
    days_per_week: o.days_per_week,
    equipment: o.equipment,
    focus_areas: o.focus_areas,
    session_minutes_target: o.session_minutes_target as number | undefined,
    constraints: o.constraints as string | undefined,
  };
}

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const briefOrError = validateBrief(body);
  if ("error" in briefOrError) {
    return Response.json({ error: briefOrError.error }, { status: 400 });
  }
  const brief = briefOrError;

  let seed;
  let usage;
  try {
    const result = await generateProgramSeed(brief);
    seed = result.seed;
    usage = result.usage;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 502 });
  }

  const insertResult = await insertProgramSeed(
    supabase,
    user.id,
    seed,
    "ai_generated",
    brief,
  );

  if ("error" in insertResult) {
    return Response.json({ error: insertResult.error }, { status: 500 });
  }

  return Response.json(
    {
      program: insertResult.program,
      session_count: insertResult.sessionCount,
      usage,
    },
    { status: 201 },
  );
}
