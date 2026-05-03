import Anthropic from "@anthropic-ai/sdk";
import { PROGRAM_STYLE_SYSTEM_PROMPT } from "./style-profile";
import type { ProgramAIBrief, ProgramArchetype, ProgramSeed } from "./types";

const MODEL = "claude-opus-4-7";
// Opus 4.7 supports up to 128K output tokens when streaming. We stream
// via messages.stream() below, so use the higher ceiling — long programs
// can otherwise truncate before all sessions are emitted.
const MAX_TOKENS = 96000;

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

const BLOCK_ITEM_SCHEMA = {
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
};

const SESSION_BLOCK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["label", "type", "name", "items", "notes"],
  properties: {
    label: { type: "string" },
    type: { type: "string", enum: BLOCK_TYPES },
    name: { type: ["string", "null"] },
    items: { type: "array", items: BLOCK_ITEM_SCHEMA },
    notes: { type: ["string", "null"] },
  },
};

const PROGRAM_SEED_JSON_SCHEMA = {
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
    source: { type: "string", enum: ["ai_generated"] },
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
          blocks: { type: "array", items: SESSION_BLOCK_SCHEMA },
          notes: { type: ["string", "null"] },
        },
      },
    },
  },
};

function buildUserMessage(brief: ProgramAIBrief): string {
  const sessionCount = brief.weeks * brief.days_per_week;
  const equipment = brief.equipment.length
    ? brief.equipment.join(", ")
    : "bodyweight only";
  const focus = brief.focus_areas.length
    ? brief.focus_areas.join(", ")
    : "general full-body";
  const minutes = brief.session_minutes_target
    ? `~${brief.session_minutes_target} min per session`
    : "session duration appropriate to the archetype";
  const constraints = brief.constraints?.trim()
    ? `Constraints / context: ${brief.constraints.trim()}`
    : "No additional constraints.";

  return `Generate a ${brief.weeks}-week program, ${brief.days_per_week} sessions per week.

Archetype: ${brief.archetype}
Focus areas: ${focus}
Equipment available: ${equipment}
Target session length: ${minutes}
${constraints}

Total sessions to emit: ${sessionCount} (weeks * days_per_week).
Set source to "ai_generated".`;
}

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

export type GenerateProgramResult = {
  seed: ProgramSeed;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
  };
};

export async function generateProgramSeed(
  brief: ProgramAIBrief,
): Promise<GenerateProgramResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured on the server");
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: PROGRAM_SEED_JSON_SCHEMA },
    },
    system: [
      {
        type: "text",
        text: PROGRAM_STYLE_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserMessage(brief) }],
  });

  const message = await stream.finalMessage();

  if (message.stop_reason === "max_tokens") {
    throw new Error(
      "Coach hit max_tokens before completing the program. Try a shorter program (fewer weeks or days_per_week).",
    );
  }
  if (message.stop_reason === "refusal") {
    throw new Error(
      "Coach refused to generate this program. Adjust the brief and try again.",
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

  const expected = brief.weeks * brief.days_per_week;
  if (parsed.sessions.length !== expected) {
    throw new Error(
      `Expected ${expected} sessions (${brief.weeks} wk x ${brief.days_per_week} d), got ${parsed.sessions.length}`,
    );
  }

  parsed.source = "ai_generated";

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
