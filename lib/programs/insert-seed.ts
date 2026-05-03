import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProgramRow, ProgramSeed, ProgramSource } from "./types";

/**
 * Insert a ProgramSeed (from any source) into `programs` + `program_sessions`.
 * Rolls back the parent program row if the sessions insert fails so we never
 * leave orphaned program shells. The caller passes the already-resolved
 * Supabase client + user id so this works from server actions or routes.
 */
export async function insertProgramSeed(
  supabase: SupabaseClient,
  userId: string,
  seed: ProgramSeed,
  source: ProgramSource,
  aiBrief: unknown = null,
): Promise<{ program: ProgramRow; sessionCount: number } | { error: string }> {
  const { data: program, error: progErr } = await supabase
    .from("programs")
    .insert({
      owner_user_id: userId,
      name: seed.name,
      slug: seed.slug,
      description: seed.description ?? null,
      archetype: seed.archetype,
      focus_areas: seed.focus_areas,
      equipment: seed.equipment,
      weeks: seed.weeks,
      days_per_week: seed.days_per_week,
      session_minutes_avg: seed.session_minutes_avg ?? null,
      source,
      ai_brief: aiBrief,
    })
    .select()
    .single();

  if (progErr || !program) {
    return { error: progErr?.message ?? "Failed to insert program" };
  }

  const programRow = program as ProgramRow;

  const sessionRows = seed.sessions.map((s) => ({
    program_id: programRow.id,
    week: s.week,
    day_of_week: s.day_of_week,
    title: s.title ?? null,
    est_minutes: s.est_minutes ?? null,
    blocks: s.blocks,
    notes: s.notes ?? null,
  }));

  const { error: sessErr } = await supabase
    .from("program_sessions")
    .insert(sessionRows);

  if (sessErr) {
    await supabase.from("programs").delete().eq("id", programRow.id);
    return { error: sessErr.message };
  }

  return { program: programRow, sessionCount: sessionRows.length };
}
