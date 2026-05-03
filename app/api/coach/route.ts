import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import {
  USER_DEFAULTS,
  getPhaseInfo,
  getTodayPrescription,
  PHASE_PLAN,
  PEPTIDE_PROTOCOLS,
  calcMacroTargets,
} from "@/lib/operator-constants";
import type {
  BodyMetricRow,
  DietLogRow,
  MealInput,
  ProfileRow,
  WorkoutCompletedRow,
} from "@/lib/operator-types";
import { parseMealText } from "@/lib/food/parse";
import { logMeals } from "@/app/actions/log-meal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COACH_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;
const HISTORY_DAYS = 14;
const MAX_INCOMING_MESSAGES = 40;
const MAX_TOOL_ROUNDS = 4;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type IncomingMessage = { role: "user" | "assistant"; content: string };

function isIncomingMessage(v: unknown): v is IncomingMessage {
  if (!v || typeof v !== "object") return false;
  const m = v as { role?: unknown; content?: unknown };
  return (
    (m.role === "user" || m.role === "assistant") &&
    typeof m.content === "string" &&
    m.content.length > 0
  );
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const COACH_TOOLS: Anthropic.Tool[] = [
  {
    name: "log_meal_from_text",
    description:
      "Parse a free-text meal description (e.g. 'two eggs and a slice of toast') into individual food rows with macros and save them to the user's diet log. Use this whenever the user asks to log, record, or save a meal. Returns a summary of what was saved so you can confirm it back to the user.",
    input_schema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "What the user ate, in plain language.",
        },
        date: {
          type: "string",
          description:
            "Date in YYYY-MM-DD. Defaults to today if omitted. Use a past date only if the user explicitly says so.",
        },
      },
      required: ["text"],
    },
  },
];

async function runCoachTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  if (name !== "log_meal_from_text") {
    return JSON.stringify({ error: `unknown tool ${name}` });
  }
  const text = typeof input.text === "string" ? input.text : "";
  const date =
    typeof input.date === "string" && ISO_DATE_RE.test(input.date)
      ? input.date
      : todayISO();
  if (!text.trim()) return JSON.stringify({ error: "text is required" });

  try {
    const items = await parseMealText(text);
    if (items.length === 0) {
      return JSON.stringify({ error: "No foods identified in the text" });
    }
    const payload: MealInput[] = items.map((it) => ({
      date,
      meal: it.name,
      calories: it.kcal,
      protein_g: it.protein_g,
      carbs_g: it.carbs_g,
      fat_g: it.fat_g,
      source: it.source,
      fdc_id: it.fdc_id,
    }));
    const result = await logMeals(payload);
    if ("error" in result) {
      return JSON.stringify({ error: result.error });
    }
    return JSON.stringify({
      logged: result.count ?? items.length,
      date,
      items: items.map((it) => ({
        name: it.name,
        qty_text: it.qty_text,
        kcal: it.kcal,
        protein_g: it.protein_g,
        source: it.source,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ error: msg });
  }
}

function buildSystemPrompt({
  profile,
  metrics,
  workouts,
  diet,
}: {
  profile: ProfileRow | null;
  metrics: BodyMetricRow[];
  workouts: WorkoutCompletedRow[];
  diet: DietLogRow[];
}): string {
  const startISO = profile?.created_at ?? new Date().toISOString();
  const phaseInfo = getPhaseInfo(startISO);
  const today = getTodayPrescription(phaseInfo);
  const latest = metrics.find((m) => m.weight_lb != null);
  const latestWeightLb = latest?.weight_lb ?? USER_DEFAULTS.startWeightLb;
  const goalWeightLb = profile?.weight_goal_lb ?? USER_DEFAULTS.goalWeightLb;
  const macros = calcMacroTargets(latestWeightLb);
  const peptide = PEPTIDE_PROTOCOLS[phaseInfo.phase.num];
  const completedThisWeek = workouts.filter((w) => w.completed).length;
  const recentMeals = diet.length;

  const phasePlanSummary = PHASE_PLAN.map(
    (p) =>
      `  - Phase ${p.num} ${p.name} (wks ${p.startWeek}-${p.endWeek}): ${p.focus}; weight target ${p.weightTargetLb} lb`,
  ).join("\n");

  return `You are Joe's personal performance coach inside the OPERATOR app.

ABOUT JOE:
- 38 years old, ex-pro football player, Marine vet
- Starting weight ${USER_DEFAULTS.startWeightLb} lb, target ${goalWeightLb} lb
- Goals: 10-12% body fat, 34-36" waist, sub-7 min mile (stretch: sub-6), comfortable 5-mile runs
- Has run 5:45 mile and 18:30 3-mile in the past — legitimate aerobic engine
- Wants longevity-focused athleticism, not just aesthetics

CURRENT STATUS:
- Phase ${phaseInfo.phase.num}: ${phaseInfo.phase.name} (week ${phaseInfo.weekNum} of 44)
- Phase focus: ${phaseInfo.phase.focus}
- Latest weight: ${latestWeightLb} lb
- Today's prescribed workout: ${today.name} (${today.tag} · ${today.duration})
- Today's target: ${today.target}
- Workouts completed in last ${HISTORY_DAYS} days: ${completedThisWeek}
- Diet log entries in last ${HISTORY_DAYS} days: ${recentMeals}
- Today is ${todayISO()}.

DAILY MACRO TARGETS (Mifflin-St Jeor on current weight):
- ${macros.calories} kcal / ${macros.proteinG}g protein / ${macros.carbsG}g carbs / ${macros.fatG}g fat
- Estimated TDEE: ${macros.tdee} kcal; cut deficit ${macros.tdee - macros.calories} kcal

PROGRAM STRUCTURE (44 weeks):
${phasePlanSummary}

ACTIVE PEPTIDE PROTOCOL (Phase ${phaseInfo.phase.num}):
${peptide.stack.map((p) => `  - ${p.name}: ${p.dose} (${p.route}); ${p.duration}; ${p.purpose}`).join("\n")}

TOOLS:
- log_meal_from_text: call this whenever Joe asks to log/record/save a meal. Pass his exact words as text. After it returns, briefly confirm what was saved and the totals.

TONE:
Direct, tactical, war-room. No coddling. Reference his actual data when relevant. Keep responses tight — 3-6 sentences unless he asks for depth. Push back on bad ideas. Cite specific protocol when modifying workouts. Longevity over aesthetics.`;
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY is not configured on the server", {
      status: 503,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const incoming =
    body && typeof body === "object" && "messages" in body
      ? (body as { messages: unknown }).messages
      : null;
  if (!Array.isArray(incoming)) {
    return new Response("messages must be an array", { status: 400 });
  }

  const incomingMessages: IncomingMessage[] = incoming
    .filter(isIncomingMessage)
    .slice(-MAX_INCOMING_MESSAGES);
  if (incomingMessages.length === 0) {
    return new Response("messages cannot be empty", { status: 400 });
  }

  const since = isoDaysAgo(HISTORY_DAYS);
  const [profileR, metricsR, workoutsR, dietR] = await Promise.all([
    supabase.from("profile").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("body_metrics")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", since)
      .order("date", { ascending: false }),
    supabase
      .from("workouts_completed")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", since)
      .order("date", { ascending: false }),
    supabase
      .from("diet_log")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", since)
      .order("date", { ascending: false }),
  ]);

  const profile = (profileR.data as ProfileRow | null) ?? null;
  const metrics = (metricsR.data as BodyMetricRow[] | null) ?? [];
  const workouts = (workoutsR.data as WorkoutCompletedRow[] | null) ?? [];
  const diet = (dietR.data as DietLogRow[] | null) ?? [];

  const systemPrompt = buildSystemPrompt({
    profile,
    metrics,
    workouts,
    diet,
  });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const conversation: Anthropic.MessageParam[] = incomingMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (s: string) => controller.enqueue(encoder.encode(s));
      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const stream = anthropic.messages.stream({
            model: COACH_MODEL,
            max_tokens: MAX_TOKENS,
            system: systemPrompt,
            tools: COACH_TOOLS,
            messages: conversation,
          });

          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              send(event.delta.text);
            }
          }

          const final = await stream.finalMessage();

          if (final.stop_reason !== "tool_use") {
            return;
          }

          // Inline indicator so the user sees that the coach is acting.
          send("\n\n_logging…_\n\n");

          conversation.push({ role: "assistant", content: final.content });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of final.content) {
            if (block.type !== "tool_use") continue;
            const result = await runCoachTool(
              block.name,
              (block.input ?? {}) as Record<string, unknown>,
            );
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result,
            });
          }
          conversation.push({ role: "user", content: toolResults });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send(`\n\n[Coach error: ${msg}]`);
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
