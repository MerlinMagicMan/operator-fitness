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
  ProfileRow,
  WorkoutCompletedRow,
} from "@/lib/operator-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COACH_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;
const HISTORY_DAYS = 14;
const MAX_INCOMING_MESSAGES = 40;

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

DAILY MACRO TARGETS (Mifflin-St Jeor on current weight):
- ${macros.calories} kcal / ${macros.proteinG}g protein / ${macros.carbsG}g carbs / ${macros.fatG}g fat
- Estimated TDEE: ${macros.tdee} kcal; cut deficit ${macros.tdee - macros.calories} kcal

PROGRAM STRUCTURE (44 weeks):
${phasePlanSummary}

ACTIVE PEPTIDE PROTOCOL (Phase ${phaseInfo.phase.num}):
${peptide.stack.map((p) => `  - ${p.name}: ${p.dose} (${p.route}); ${p.duration}; ${p.purpose}`).join("\n")}

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

  const messages: IncomingMessage[] = incoming
    .filter(isIncomingMessage)
    .slice(-MAX_INCOMING_MESSAGES);
  if (messages.length === 0) {
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

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: COACH_MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
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
        controller.enqueue(encoder.encode(`\n\n[Coach error: ${msg}]`));
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
