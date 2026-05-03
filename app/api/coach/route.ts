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
  MealType,
  ProfileRow,
  ProgramEnrollmentRow,
  ProgramRow,
  ProgramSessionRow,
  SessionCompletionRow,
  WorkoutCompletedRow,
} from "@/lib/operator-types";
import { parseMealText } from "@/lib/food/parse";
import { logMeals } from "@/app/actions/log-meal";
import { suggestMealTypeForDate } from "@/lib/food/meal-type";
import { localDateISO } from "@/lib/date";

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

function isoDaysAgo(days: number, timezone?: string | null): string {
  return localDateISO(timezone, new Date(Date.now() - days * 86_400_000));
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
        meal_type: {
          type: "string",
          enum: ["breakfast", "lunch", "dinner", "snack"],
          description:
            "Which slot of the day. Infer from the user's wording ('my breakfast' → breakfast); fall back to time-of-day if unclear.",
        },
        eaten_at: {
          type: "string",
          description:
            "ISO 8601 timestamp of when the meal was eaten, e.g. '2026-05-03T08:30:00-05:00'. Omit to use the current server time.",
        },
      },
      required: ["text"],
    },
  },
];

function isMealType(v: unknown): v is MealType {
  return v === "breakfast" || v === "lunch" || v === "dinner" || v === "snack";
}

async function runCoachTool(
  name: string,
  input: Record<string, unknown>,
  timezone: string | null,
): Promise<string> {
  if (name !== "log_meal_from_text") {
    return JSON.stringify({ error: `unknown tool ${name}` });
  }
  const text = typeof input.text === "string" ? input.text : "";
  const date =
    typeof input.date === "string" && ISO_DATE_RE.test(input.date)
      ? input.date
      : localDateISO(timezone);
  if (!text.trim()) return JSON.stringify({ error: "text is required" });

  const meal_type: MealType = isMealType(input.meal_type)
    ? input.meal_type
    : suggestMealTypeForDate();

  let eaten_at: string | null;
  if (typeof input.eaten_at === "string") {
    const parsed = Date.parse(input.eaten_at);
    eaten_at = Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
  } else {
    eaten_at = new Date().toISOString();
  }

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
      meal_type,
      eaten_at,
    }));
    const result = await logMeals(payload);
    if ("error" in result) {
      return JSON.stringify({ error: result.error });
    }
    return JSON.stringify({
      logged: result.count ?? items.length,
      date,
      meal_type,
      eaten_at,
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

type ActiveProgramSummary = {
  name: string;
  archetype: string;
  currentWeek: number;
  totalWeeks: number;
  daysPerWeek: number;
  focusAreas: string[];
  equipment: string[];
  todaySessionTitle: string | null;
  todaySessionCompleted: boolean;
  completedCount: number;
  totalSessions: number;
};

function buildActiveProgramSummaries({
  programs,
  enrollments,
  sessions,
  completions,
}: {
  programs: ProgramRow[];
  enrollments: ProgramEnrollmentRow[];
  sessions: ProgramSessionRow[];
  completions: SessionCompletionRow[];
}): ActiveProgramSummary[] {
  const jsDay = new Date().getDay();
  const todayDayOfWeek = ((jsDay + 6) % 7) + 1;

  return enrollments
    .filter((e) => e.status === "active")
    .map((enrollment): ActiveProgramSummary | null => {
      const program = programs.find((p) => p.id === enrollment.program_id);
      if (!program) return null;
      const programSessions = sessions.filter(
        (s) => s.program_id === program.id,
      );
      const todaySession =
        programSessions.find(
          (s) =>
            s.week === enrollment.current_week &&
            s.day_of_week === todayDayOfWeek,
        ) ?? null;
      const enrollmentCompletions = completions.filter(
        (c) => c.enrollment_id === enrollment.id,
      );
      const todayCompleted =
        todaySession !== null &&
        enrollmentCompletions.some(
          (c) =>
            c.week === todaySession.week &&
            c.day_of_week === todaySession.day_of_week,
        );
      return {
        name: program.name,
        archetype: program.archetype,
        currentWeek: enrollment.current_week,
        totalWeeks: program.weeks,
        daysPerWeek: program.days_per_week,
        focusAreas: program.focus_areas,
        equipment: program.equipment,
        todaySessionTitle: todaySession?.title ?? null,
        todaySessionCompleted: todayCompleted,
        completedCount: enrollmentCompletions.length,
        totalSessions: program.weeks * program.days_per_week,
      };
    })
    .filter((s): s is ActiveProgramSummary => s !== null);
}

function formatActivePrograms(summaries: ActiveProgramSummary[]): string {
  if (summaries.length === 0) return "  (none — no programs currently active)";
  return summaries
    .map((s) => {
      const today = s.todaySessionTitle
        ? `today's session: "${s.todaySessionTitle}"${s.todaySessionCompleted ? " (DONE)" : ""}`
        : "no session scheduled today";
      const focus = s.focusAreas.length
        ? ` focus: ${s.focusAreas.join(", ")};`
        : "";
      return `  - ${s.name} [${s.archetype}] wk ${s.currentWeek}/${s.totalWeeks}, ${s.daysPerWeek}d/wk, ${s.completedCount}/${s.totalSessions} sessions done;${focus} ${today}`;
    })
    .join("\n");
}

type LibraryProgramSummary = {
  name: string;
  archetype: string;
  weeks: number;
  daysPerWeek: number;
  sessionMinutesAvg: number | null;
  focusAreas: string[];
  equipment: string[];
  source: string;
  createdAt: string;
};

function buildLibraryProgramSummaries({
  programs,
  enrollments,
}: {
  programs: ProgramRow[];
  enrollments: ProgramEnrollmentRow[];
}): LibraryProgramSummary[] {
  const activeProgramIds = new Set(
    enrollments.filter((e) => e.status === "active").map((e) => e.program_id),
  );
  return programs
    .filter((p) => !activeProgramIds.has(p.id))
    .map((p) => ({
      name: p.name,
      archetype: p.archetype,
      weeks: p.weeks,
      daysPerWeek: p.days_per_week,
      sessionMinutesAvg: p.session_minutes_avg,
      focusAreas: p.focus_areas,
      equipment: p.equipment,
      source: p.source,
      createdAt: p.created_at,
    }));
}

function formatLibraryPrograms(summaries: LibraryProgramSummary[]): string {
  if (summaries.length === 0) {
    return "  (none — no other programs in the library)";
  }
  return summaries
    .map((s) => {
      const minutes = s.sessionMinutesAvg
        ? `, ~${s.sessionMinutesAvg} min`
        : "";
      const focus = s.focusAreas.length
        ? ` focus: ${s.focusAreas.join(", ")};`
        : "";
      const equip = s.equipment.length
        ? ` equipment: ${s.equipment.join(", ")};`
        : "";
      return `  - ${s.name} [${s.archetype}, ${s.source}] ${s.weeks}w x ${s.daysPerWeek}d/wk${minutes};${focus}${equip}`;
    })
    .join("\n");
}

function buildSystemPrompt({
  profile,
  metrics,
  workouts,
  diet,
  activePrograms,
  libraryPrograms,
}: {
  profile: ProfileRow | null;
  metrics: BodyMetricRow[];
  workouts: WorkoutCompletedRow[];
  diet: DietLogRow[];
  activePrograms: ActiveProgramSummary[];
  libraryPrograms: LibraryProgramSummary[];
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
- Today is ${localDateISO(profile?.timezone)} (in ${profile?.timezone ?? "America/Chicago"}).

DAILY MACRO TARGETS (Mifflin-St Jeor on current weight):
- ${macros.calories} kcal / ${macros.proteinG}g protein / ${macros.carbsG}g carbs / ${macros.fatG}g fat
- Estimated TDEE: ${macros.tdee} kcal; cut deficit ${macros.tdee - macros.calories} kcal

PROGRAM STRUCTURE (44 weeks):
${phasePlanSummary}

ACTIVE PEPTIDE PROTOCOL (Phase ${phaseInfo.phase.num}):
${peptide.stack.map((p) => `  - ${p.name}: ${p.dose} (${p.route}); ${p.duration}; ${p.purpose}`).join("\n")}

ACTIVE PROGRAMS (overlays currently running alongside the 44-week build):
${formatActivePrograms(activePrograms)}

PROGRAM LIBRARY (other programs Joe owns; not currently enrolled):
${formatLibraryPrograms(libraryPrograms)}

You can refer to library programs by name when Joe asks about them. He has to enroll a library program before sessions can be checked off, but you can describe what's in it, compare it to what he's running now, or recommend enrolling.

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
  const [
    profileR,
    metricsR,
    workoutsR,
    dietR,
    programsR,
    enrollmentsR,
    sessionsR,
    completionsR,
  ] = await Promise.all([
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
    supabase.from("programs").select("*").eq("owner_user_id", user.id),
    supabase
      .from("program_enrollments")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active"),
    supabase.from("program_sessions").select("*"),
    supabase.from("session_completions").select("*"),
  ]);

  const profile = (profileR.data as ProfileRow | null) ?? null;
  const metrics = (metricsR.data as BodyMetricRow[] | null) ?? [];
  const workouts = (workoutsR.data as WorkoutCompletedRow[] | null) ?? [];
  const diet = (dietR.data as DietLogRow[] | null) ?? [];
  const programs = (programsR.data as ProgramRow[] | null) ?? [];
  const enrollments =
    (enrollmentsR.data as ProgramEnrollmentRow[] | null) ?? [];
  const programSessions = (sessionsR.data as ProgramSessionRow[] | null) ?? [];
  const sessionCompletions =
    (completionsR.data as SessionCompletionRow[] | null) ?? [];

  const activePrograms = buildActiveProgramSummaries({
    programs,
    enrollments,
    sessions: programSessions,
    completions: sessionCompletions,
  });

  const libraryPrograms = buildLibraryProgramSummaries({
    programs,
    enrollments,
  });

  const systemPrompt = buildSystemPrompt({
    profile,
    metrics,
    workouts,
    diet,
    activePrograms,
    libraryPrograms,
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
              profile?.timezone ?? null,
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
