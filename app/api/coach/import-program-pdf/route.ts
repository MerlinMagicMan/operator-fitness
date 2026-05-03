import { createClient } from "@/lib/supabase/server";
import { importProgramSeedFromPdf } from "@/lib/programs/pdf-importer";
import { insertProgramSeed } from "@/lib/programs/insert-seed";
import type { ProgramArchetype } from "@/lib/programs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PDF_BYTES = 32 * 1024 * 1024;

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

function isArchetype(v: unknown): v is ProgramArchetype {
  return (
    typeof v === "string" && VALID_ARCHETYPES.includes(v as ProgramArchetype)
  );
}

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Body must be multipart/form-data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "file field is required" }, { status: 400 });
  }
  if (file.type && file.type !== "application/pdf") {
    return Response.json({ error: "file must be a PDF" }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return Response.json(
      {
        error: `PDF is ${(file.size / 1024 / 1024).toFixed(1)} MB; max is 32 MB.`,
      },
      { status: 400 },
    );
  }

  const programNameRaw = formData.get("program_name");
  const archetypeRaw = formData.get("archetype");
  const notesRaw = formData.get("notes");

  const hint = {
    programName:
      typeof programNameRaw === "string" && programNameRaw.trim()
        ? programNameRaw.trim()
        : undefined,
    archetype: isArchetype(archetypeRaw) ? archetypeRaw : undefined,
    notes:
      typeof notesRaw === "string" && notesRaw.trim()
        ? notesRaw.trim()
        : undefined,
  };

  const bytes = new Uint8Array(await file.arrayBuffer());

  let seed;
  let usage;
  try {
    const result = await importProgramSeedFromPdf(bytes, hint);
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
    "transcribed",
    {
      via: "pdf_import",
      filename: file.name,
      hint,
    },
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
