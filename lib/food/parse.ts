/**
 * Natural-language meal parser. Takes a description like "two eggs and a
 * slice of toast" and returns one ParsedMealItem per food. Uses Claude
 * tool-use to drive USDA FDC lookups; falls back to LLM-only estimates
 * when FDC_API_KEY is missing or a search returns nothing.
 *
 * Architecturally this is the same shape as the reference Python MCP
 * server (https://github.com/AlwaysSany/food-nutrition) — Claude with
 * `search_usda_food` + `get_food_nutrients` tools — just inlined into
 * our Next.js API route instead of a separate MCP process.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ParsedMealItem } from "@/lib/operator-types";
import {
  getFoodMacros,
  isFdcConfigured,
  scaleMacros,
  searchFood,
} from "@/lib/food/fdc";

const PARSE_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;
const MAX_TOOL_ROUNDS = 6;

const SYSTEM_PROMPT = `You parse a user's meal description into structured rows for a nutrition log.

For each distinct food item the user mentions:
1. Estimate the gram weight from the described quantity (use typical serving sizes when vague — "a slice of toast" ≈ 30g, "a cup of cooked rice" ≈ 195g, "a large egg" ≈ 50g).
2. Use the search_usda_food tool to find a real USDA FDC entry, then call get_food_nutrients with the chosen fdcId and your gram estimate to get accurate macros.
3. If the user gives a brand or restaurant item that won't be in USDA (e.g. "Chipotle bowl"), skip the tools and use your best estimate — set source to "estimate".

When you have macros for every item, reply with ONLY a JSON object on a single line, no prose, no code fence:
{"items":[{"name":"Egg, large","qty_text":"2 eggs","grams":100,"kcal":143,"protein_g":12.6,"carbs_g":0.7,"fat_g":9.5,"source":"usda","fdc_id":"748967"}]}

Rules:
- "name" is the food's canonical name (USDA description if matched, otherwise a clean human label).
- "qty_text" echoes how the user described it.
- "source" is "usda" if you got it from the FDC tools, "estimate" otherwise.
- "fdc_id" is the FDC id as a string, or null for estimates.
- Round kcal to int, macros to one decimal.
- Never include foods the user did not mention.
- If the input contains zero foods, reply with {"items":[]}.`;

const TOOLS_WITH_FDC: Anthropic.Tool[] = [
  {
    name: "search_usda_food",
    description:
      "Search USDA FoodData Central for a food. Returns up to 5 hits with fdcId + description. Use to resolve a user's described food to a canonical FDC entry before fetching nutrients.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Plain English food query, e.g. 'chicken breast'.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_food_nutrients",
    description:
      "Fetch macros for a USDA FDC food, scaled to a serving in grams. Returns kcal, protein_g, carbs_g, fat_g.",
    input_schema: {
      type: "object",
      properties: {
        fdc_id: {
          type: "number",
          description: "The fdcId returned by search_usda_food.",
        },
        grams: {
          type: "number",
          description: "Serving size in grams.",
        },
      },
      required: ["fdc_id", "grams"],
    },
  },
];

type ToolInput = Record<string, unknown>;

async function runTool(name: string, input: ToolInput): Promise<string> {
  try {
    if (name === "search_usda_food") {
      const q = String(input.query ?? "").trim();
      if (!q) return JSON.stringify({ error: "empty query" });
      const hits = await searchFood(q);
      const top = hits.slice(0, 5).map((h) => ({
        fdc_id: h.fdcId,
        description: h.description,
        data_type: h.dataType,
        brand: h.brandOwner ?? null,
      }));
      return JSON.stringify({ hits: top });
    }
    if (name === "get_food_nutrients") {
      const fdcId = Number(input.fdc_id);
      const grams = Number(input.grams);
      if (!Number.isFinite(fdcId) || !Number.isFinite(grams) || grams <= 0) {
        return JSON.stringify({ error: "invalid fdc_id or grams" });
      }
      const macros = await getFoodMacros(fdcId);
      const scaled = scaleMacros(macros.per100g, grams);
      return JSON.stringify({
        fdc_id: macros.fdcId,
        description: macros.description,
        grams,
        ...scaled,
      });
    }
    return JSON.stringify({ error: `unknown tool ${name}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ error: msg });
  }
}

function extractFinalText(blocks: Anthropic.ContentBlock[]): string {
  return blocks
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function coerceItem(raw: unknown): ParsedMealItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const name = typeof r.name === "string" ? r.name.trim() : "";
  if (!name) return null;
  const qty = typeof r.qty_text === "string" ? r.qty_text.trim() : "";
  const source =
    r.source === "usda" || r.source === "estimate" ? r.source : "estimate";
  const fdcId =
    typeof r.fdc_id === "string"
      ? r.fdc_id
      : typeof r.fdc_id === "number"
        ? String(r.fdc_id)
        : null;

  const pickNum = (key: string): number | null => {
    const v = r[key];
    return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
  };

  return {
    name,
    qty_text: qty,
    grams: pickNum("grams"),
    kcal: pickNum("kcal"),
    protein_g: pickNum("protein_g"),
    carbs_g: pickNum("carbs_g"),
    fat_g: pickNum("fat_g"),
    source: source as ParsedMealItem["source"],
    fdc_id: source === "usda" ? fdcId : null,
  };
}

function parseFinalJson(text: string): ParsedMealItem[] {
  // Strip code fences if Claude added them despite the instructions.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Last-ditch: pull the first {...} substring.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return [];
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return [];
    }
  }

  if (!parsed || typeof parsed !== "object") return [];
  const items = (parsed as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items.map(coerceItem).filter((x): x is ParsedMealItem => x !== null);
}

export async function parseMealText(text: string): Promise<ParsedMealItem[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  const trimmed = text.trim();
  if (!trimmed) return [];

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const tools = isFdcConfigured() ? TOOLS_WITH_FDC : [];

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: trimmed },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: PARSE_MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: tools.length > 0 ? tools : undefined,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      return parseFinalJson(extractFinalText(response.content));
    }

    // Run every tool_use block in this turn, then loop with the results.
    messages.push({ role: "assistant", content: response.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const result = await runTool(
        block.name,
        (block.input ?? {}) as ToolInput,
      );
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result,
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  // Hit the round cap without a final reply — return empty rather than
  // saving a half-baked parse.
  return [];
}
