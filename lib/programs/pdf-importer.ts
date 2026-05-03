import Anthropic from "@anthropic-ai/sdk";
import type { ProgramArchetype, ProgramSeed } from "./types";

const MODEL = "claude-opus-4-7";
const MAX_TOKENS = 32000;
const MAX_PDF_BYTES = 32 * 1024 * 1024;

const ARCHETYPES: readonly ProgramArchetype[] = [
  "bodyweight_mobility",
  "banded_mobility",
  "loaded_mobility",
  "advanced_loaded_mobility",
  "bodyweight_conditioning",
  "dynamic_strength",
  "functional_sc",
  "custom",
];

const BLOCK_TYPES = [
  "warmup",
  "mobility",
  "strength",
  "capacity",
  "cooldown",
] as const;

// Same schema the generator uses, with source allowing "transcribed" too.
const PDF_PROGRAM_SEED_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "slug",
    "name",
    "description",
    "archetype",
    "focus_areas",
    "equipment",
    "weeks",
    "days_per_week",
    "session_minutes_avg",
    "source",
    "sessions",
  ],
  properties: {
    slug: { type: "string" },
    name: { type: "string" },
    description: { type: ["string", "null"] },
    archetype: { type: "string", enum: ARCHETYPES },
    focus_areas: { type: "array", items: { type: "string" } },
    equipment: { type: "array", items: { type: "string" } },
    weeks: { type: "integer" },
    days_per_week: { type: "integer" },
    session_minutes_avg: { type: ["integer", "null"] },
    source: { type: "string", enum: ["transcribed"] },
    sessions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "week",
          "day_of_week",
          "title",
          "est_minutes",
          "blocks",
          "notes",
        ],
        properties: {
          week: { type: "integer" },
          day_of_week: { type: "integer" },
          title: { type: ["string", "null"] },
          est_minutes: { type: ["integer", "null"] },
          blocks: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "type", "name", "items", "notes"],
              properties: {
                label: { type: "string" },
                type: { type: "string", enum: BLOCK_TYPES },
                name: { type: ["string", "null"] },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: [
                      "name",
                      "sets",
                      "reps",
                      "duration_s",
                      "tempo",
                      "rpe",
                      "load",
                      "notes",
                    ],
                    properties: {
                      name: { type: "string" },
                      sets: { type: ["integer", "null"] },
                      reps: { type: ["integer", "null"] },
                      duration_s: { type: ["integer", "null"] },
                      tempo: { type: ["string", "null"] },
                      rpe: { type: ["number", "null"] },
                      load: { type: ["string", "null"] },
                      notes: { type: ["string", "null"] },
                    },
                  },
                },
                notes: { type: ["string", "null"] },
              },
            },
          },
          notes: { type: ["string", "null"] },
        },
      },
    },
  },
};

const PDF_IMPORT_SYSTEM_PROMPT = `You are a structured-extraction tool. Read the attached PDF, which the user has uploaded as a training program they own and want to use in their own personal training app. Extract the program faithfully into the supplied JSON schema.

# EXTRACTION RULES

## Program metadata
- name: the program title as it appears on the cover/intro page.
- slug: short kebab-case derived from the name (e.g. "runners-mobility-strength-8w"). Lowercase, ASCII letters/digits/hyphens only.
- description: 1-2 sentence summary from the intro page.
- weeks: total program length in weeks (read from intro).
- days_per_week: training sessions per week (read from intro or the weekly grid).
- archetype: one of the allowed values; pick the closest fit based on the program's focus.
- equipment: every item the program lists as required or recommended.
- focus_areas: short list of joints/regions the program emphasizes (e.g. "hips", "t-spine", "shoulders", "ankles").
- session_minutes_avg: estimate based on session content, or null if you can't tell.

## Sessions
- Emit exactly weeks * days_per_week sessions.
- day_of_week uses ISO 1=Monday ... 7=Sunday. Map day names accordingly:
  Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=7.
- title: a short session label (e.g. the day name, or the session focus if the PDF supplies one).
- est_minutes: estimate from session content, or null.

## Blocks and items
- Use the EXACT block labels from the PDF (A, A1, A2, B, B1, B2, C, D1, D2, etc.).
- Use the EXACT movement names from the PDF. Do not rename, paraphrase, simplify, or substitute.
- block.type: classify each block as warmup | mobility | strength | capacity | cooldown based on what's in it.
- Block "name" is optional — only set it if the PDF labels the block with a name beyond just the letter.
- Item fields (parse the program's own notation conservatively):
  * sets and reps: when notation is "3 x 8" → sets=3, reps=8.
  * isometric holds: "3 x 1 @ 10" → sets=3, reps=1, duration_s=10.
  * carries / distance work: "3 x 40" on a carry-style movement → sets=3, reps=null, duration_s=null, but put the distance into notes (e.g. "40 yards"). Do not invent units that the PDF didn't specify.
  * tempo: copy any tempo string verbatim into the tempo field (e.g. "3-1-3", "slow eccentric").
  * load: copy any load specification verbatim into the load field (e.g. "BW", "60% 1RM", "24kg KB"). Leave null if not specified.
  * rpe: copy any per-item RPE if specified, otherwise null.
  * notes: any per-item cue, hold-time spec, side-count, or qualifier the PDF includes.

## What NOT to do
- Do not invent movements, blocks, or sessions that aren't in the PDF.
- Do not reword movement names "for clarity" — keep them verbatim.
- Do not skip movements you can't classify; put them in the closest-fitting block and use notes to flag uncertainty.
- If a session is genuinely missing from the PDF (e.g. a deload week with "rest" only), still emit a row with an empty cooldown block named "Rest day".`;

function isProgramSeed(v: unknown): v is ProgramSeed {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.slug === "string" &&
    typeof o.name === "string" &&
    typeof o.archetype === "string" &&
    Array.isArray(o.focus_areas) &&
    Array.isArray(o.equipment) &&
    typeof o.weeks === "number" &&
    typeof o.days_per_week === "number" &&
    Array.isArray(o.sessions)
  );
}

export type ImportProgramHint = {
  programName?: string;
  archetype?: ProgramArchetype;
  notes?: string;
};

export type ImportProgramResult = {
  seed: ProgramSeed;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
  };
};

function buildHintMessage(hint?: ImportProgramHint): string {
  const lines: string[] = [
    'Extract this PDF into the supplied JSON schema. Set source to "transcribed".',
  ];
  if (hint?.programName?.trim()) {
    lines.push(`User-supplied name override: "${hint.programName.trim()}".`);
  }
  if (hint?.archetype) {
    lines.push(`User-supplied archetype hint: ${hint.archetype}.`);
  }
  if (hint?.notes?.trim()) {
    lines.push(`Additional context from the user: ${hint.notes.trim()}`);
  }
  return lines.join("\n");
}

export async function importProgramSeedFromPdf(
  pdfBytes: Uint8Array,
  hint?: ImportProgramHint,
): Promise<ImportProgramResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server");
  }
  if (pdfBytes.byteLength > MAX_PDF_BYTES) {
    throw new Error(
      `PDF is ${(pdfBytes.byteLength / 1024 / 1024).toFixed(1)} MB; max is 32 MB.`,
    );
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const base64 = Buffer.from(pdfBytes).toString("base64");

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: PDF_PROGRAM_SEED_SCHEMA },
    },
    system: PDF_IMPORT_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          { type: "text", text: buildHintMessage(hint) },
        ],
      },
    ],
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === "max_tokens") {
    throw new Error(
      "Coach hit max_tokens before finishing the PDF. The program may be too long; try splitting it.",
    );
  }
  if (message.stop_reason === "refusal") {
    throw new Error(
      "Coach refused to parse this PDF. Adjust the file or hints and try again.",
    );
  }

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Coach returned no text content");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error("Coach returned invalid JSON");
  }
  if (!isProgramSeed(parsed)) {
    throw new Error("Coach returned a JSON object missing required fields");
  }

  parsed.source = "transcribed";

  // Soft sanity: warn but accept if the count is off, since transcription
  // mistakes shouldn't block the import outright. The user can delete and
  // re-import if it's badly off.
  const expected = parsed.weeks * parsed.days_per_week;
  if (parsed.sessions.length === 0) {
    throw new Error("Parsed program has zero sessions; aborting.");
  }
  if (Math.abs(parsed.sessions.length - expected) > expected * 0.25) {
    throw new Error(
      `Parsed ${parsed.sessions.length} sessions but expected ~${expected} (${parsed.weeks} wk x ${parsed.days_per_week} d). The parse looks wrong; try again or split the PDF.`,
    );
  }

  return {
    seed: parsed,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      cache_read_input_tokens: message.usage.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens:
        message.usage.cache_creation_input_tokens ?? 0,
    },
  };
}
