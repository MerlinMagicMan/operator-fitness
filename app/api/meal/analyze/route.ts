import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  USER_DEFAULTS,
  calcMacroTargets,
  getPhaseInfo,
} from "@/lib/operator-constants";
import type {
  BodyMetricRow,
  DietLogRow,
  MealType,
  ParsedMealItem,
  ProfileRow,
} from "@/lib/operator-types";
import { MEAL_TYPE_LABEL, formatTimeOfDay } from "@/lib/food/meal-type";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANALYZE_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 768;
const MAX_MESSAGES = 20;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type IncomingMessage = { role: "user" | "assistant"; content: string };

function isMessage(v: unknown): v is IncomingMessage {
  if (!v || typeof v !== "object") return false;
  const m = v as { role?: unknown; content?: unknown };
  return (
    (m.role === "user" || m.role === "assistant") &&
    typeof m.content === "string" &&
    m.content.length > 0
  );
}

type Macros = { kcal: number; p: number; c: number; f: number };

function sumRows(rows: DietLogRow[]): Macros {
  return rows.reduce<Macros>(
    (acc, r) => ({
      kcal: acc.kcal + (r.calories ?? 0),
      p: acc.p + (r.protein_g ?? 0),
      c: acc.c + (r.carbs_g ?? 0),
      f: acc.f + (r.fat_g ?? 0),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );
}

function sumItems(items: ParsedMealItem[]): Macros {
  return items.reduce<Macros>(
    (acc, it) => ({
      kcal: acc.kcal + (it.kcal ?? 0),
      p: acc.p + (it.protein_g ?? 0),
      c: acc.c + (it.carbs_g ?? 0),
      f: acc.f + (it.fat_g ?? 0),
    }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );
}

function macroLine(m: Macros): string {
  return `${Math.round(m.kcal)} kcal / ${m.p.toFixed(0)}g P / ${m.c.toFixed(0)}g C / ${m.f.toFixed(0)}g F`;
}

type AnalyzePayload = {
  scope: "meal" | "day";
  date: string;
  mealId?: string;
  items?: ParsedMealItem[];
  mealType?: MealType;
  eatenAt?: string;
  messages?: IncomingMessage[];
};

function parsePayload(body: unknown): AnalyzePayload | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid JSON body" };
  const b = body as Record<string, unknown>;
  const scope = b.scope === "meal" || b.scope === "day" ? b.scope : null;
  if (!scope) return { error: "scope must be 'meal' or 'day'" };
  const date = typeof b.date === "string" ? b.date : "";
  if (!ISO_DATE_RE.test(date)) return { error: "date must be YYYY-MM-DD" };
  const mealId = typeof b.mealId === "string" ? b.mealId : undefined;
  const mealType =
    b.mealType === "breakfast" ||
    b.mealType === "lunch" ||
    b.mealType === "dinner" ||
    b.mealType === "snack"
      ? (b.mealType as MealType)
      : undefined;
  const eatenAt = typeof b.eatenAt === "string" ? b.eatenAt : undefined;
  const items = Array.isArray(b.items)
    ? (b.items as ParsedMealItem[])
    : undefined;
  const messages = Array.isArray(b.messages)
    ? (b.messages as unknown[]).filter(isMessage).slice(-MAX_MESSAGES)
    : [];
  return { scope, date, mealId, items, mealType, eatenAt, messages };
}

function describeMeal(
  rows: DietLogRow[],
  fallbackItems?: ParsedMealItem[],
  mealType?: MealType,
  eatenAt?: string,
): string {
  if (rows.length > 0) {
    const lines = rows.map((r) => {
      const macros = `${r.calories ?? 0} kcal / ${r.protein_g ?? 0}g P / ${r.carbs_g ?? 0}g C / ${r.fat_g ?? 0}g F`;
      const flag = r.source === "estimate" ? " [estimate]" : "";
      return `  - ${r.meal} — ${macros}${flag}`;
    });
    const totals = sumRows(rows);
    const typeLabel = mealType ? MEAL_TYPE_LABEL[mealType] : "MEAL";
    const time = eatenAt ? formatTimeOfDay(eatenAt) : "";
    return `${typeLabel}${time ? ` @ ${time}` : ""}:\n${lines.join("\n")}\nTotal: ${macroLine(totals)}`;
  }
  if (fallbackItems && fallbackItems.length > 0) {
    const lines = fallbackItems.map((it) => {
      const macros = `${it.kcal ?? 0} kcal / ${it.protein_g ?? 0}g P / ${it.carbs_g ?? 0}g C / ${it.fat_g ?? 0}g F`;
      const flag = it.source === "estimate" ? " [estimate]" : "";
      return `  - ${it.name}${it.qty_text ? ` (${it.qty_text})` : ""} — ${macros}${flag}`;
    });
    const totals = sumItems(fallbackItems);
    const typeLabel = mealType ? MEAL_TYPE_LABEL[mealType] : "MEAL";
    const time = eatenAt ? formatTimeOfDay(eatenAt) : "";
    return `${typeLabel}${time ? ` @ ${time}` : ""}:\n${lines.join("\n")}\nTotal: ${macroLine(totals)}`;
  }
  return "(no items)";
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY is not configured", {
      status: 503,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const parsed = parsePayload(body);
  if ("error" in parsed) return new Response(parsed.error, { status: 400 });

  const {
    scope,
    date,
    mealId,
    items,
    mealType,
    eatenAt,
    messages = [],
  } = parsed;

  const [profileR, metricsR, dayR] = await Promise.all([
    supabase.from("profile").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("body_metrics")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(5),
    supabase
      .from("diet_log")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("eaten_at", { ascending: true, nullsFirst: false }),
  ]);

  const profile = (profileR.data as ProfileRow | null) ?? null;
  const metrics = (metricsR.data as BodyMetricRow[] | null) ?? [];
  const dayRows = (dayR.data as DietLogRow[] | null) ?? [];

  const startISO =
    profile?.program_start_date ??
    profile?.created_at ??
    new Date().toISOString();
  const phaseInfo = getPhaseInfo(startISO);
  const latestWeightLb =
    metrics.find((m) => m.weight_lb != null)?.weight_lb ??
    USER_DEFAULTS.startWeightLb;
  const targets = calcMacroTargets(latestWeightLb);
  const dayTotals = sumRows(dayRows);

  let mealRows: DietLogRow[] = [];
  if (scope === "meal") {
    if (mealId) {
      mealRows = dayRows.filter((r) => r.id === mealId);
      if (mealRows.length === 0) {
        const sameType = dayRows.filter((r) => r.meal_type === mealType);
        mealRows = sameType;
      }
    } else if (mealType) {
      mealRows = dayRows.filter((r) => r.meal_type === mealType);
    }
  }

  const mealDescription =
    scope === "meal"
      ? describeMeal(mealRows, items, mealType, eatenAt)
      : "(see day rollup below)";

  const dayDescription =
    dayRows.length > 0
      ? dayRows
          .map(
            (r) =>
              `  - ${r.meal_type ? MEAL_TYPE_LABEL[r.meal_type] : "?"} · ${r.meal}: ${r.calories ?? 0} kcal / ${r.protein_g ?? 0}g P`,
          )
          .join("\n")
      : "  (nothing logged yet)";

  const targetMacros: Macros = {
    kcal: targets.calories,
    p: targets.proteinG,
    c: targets.carbsG,
    f: targets.fatG,
  };

  const systemPrompt = `You are Joe's nutrition analyst inside the OPERATOR app.

CONTEXT:
- Phase ${phaseInfo.phase.num} ${phaseInfo.phase.name} (week ${phaseInfo.weekNum}/44) — ${phaseInfo.phase.focus}
- Latest weight: ${latestWeightLb} lb
- Daily targets: ${macroLine(targetMacros)}
- Today (${date}) totals so far: ${macroLine(dayTotals)}
  → remaining: ${Math.round(targets.calories - dayTotals.kcal)} kcal / ${Math.max(0, Math.round(targets.proteinG - dayTotals.p))}g P / ${Math.max(0, Math.round(targets.carbsG - dayTotals.c))}g C / ${Math.max(0, Math.round(targets.fatG - dayTotals.f))}g F
- All meals today:
${dayDescription}

${scope === "meal" ? `THIS MEAL:\n${mealDescription}` : `SCOPE: full day rollup`}

YOUR JOB:
- ${scope === "meal" ? "Analyze THIS MEAL: how it fits the day, what it nudges, any obvious swap." : "Analyze the day so far: hits/misses vs targets, what to eat next."}
- Reply in 2-3 short sentences for the opening read. Expand only when Joe asks.
- Reference real numbers from the context, not platitudes.
- If asked for swaps or alternatives, give a concrete portion (e.g. "swap the rice for 4oz sweet potato — same carbs, more fiber").
- Direct, tactical, war-room tone. No motivational filler.`;

  // First call: client sends empty messages → seed with a synthetic prompt so
  // Claude opens with the initial analysis.
  const apiMessages: Anthropic.MessageParam[] =
    messages.length > 0
      ? messages.map((m) => ({ role: m.role, content: m.content }))
      : [
          {
            role: "user",
            content:
              scope === "meal"
                ? "Give me a quick read on this meal."
                : "Give me a quick read on today's intake so far.",
          },
        ];

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: ANALYZE_MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: apiMessages,
        });
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`\n\n[Analyst error: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
