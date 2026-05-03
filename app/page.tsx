import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  USER_DEFAULTS,
  getPhaseInfo,
  getTodayPrescription,
  type PhaseInfo,
} from "@/lib/operator-constants";
import { calculateStreak } from "@/lib/streak";
import type {
  ActivityRow,
  BodyMetricRow,
  DietLogRow,
  OAuthTokenRow,
  ProfileRow,
  ProgramEnrollmentRow,
  ProgramRow,
  ProgramSessionRow,
  SessionCompletionRow,
  WorkoutCompletedRow,
} from "@/lib/operator-types";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  DashboardShell,
  type TabSlots,
} from "@/components/dashboard/DashboardShell";
import { PhaseStrip } from "@/components/dashboard/PhaseStrip";
import { DashView } from "@/components/dashboard/panels/DashView";
import { WeeklyRollup } from "@/components/dashboard/panels/WeeklyRollup";
import { DietPanel } from "@/components/dashboard/panels/DietPanel";
import { PeptidePanel } from "@/components/dashboard/panels/PeptidePanel";
import {
  ImportPanel,
  type StravaConnection,
} from "@/components/dashboard/panels/ImportPanel";
import { ProgramsPanel } from "@/components/dashboard/panels/ProgramsPanel";
import type { TodayOverlayItem } from "@/components/dashboard/panels/TodayOverlay";

// Auth-gated; reads the Supabase session per request and pulls the user's
// dashboard data.
export const dynamic = "force-dynamic";

type RawSearchParams = Record<string, string | string[] | undefined>;

function singleParam(params: RawSearchParams, key: string): string | undefined {
  const v = params[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function buildImportFlash(
  params: RawSearchParams,
): { kind: "success" | "error"; message: string } | null {
  const connected = singleParam(params, "strava_connected");
  if (connected === "true") {
    return {
      kind: "success",
      message: "Strava connected. First sync runs on the next cron tick.",
    };
  }
  const disconnected = singleParam(params, "strava_disconnected");
  if (disconnected === "true") {
    return {
      kind: "success",
      message: "Strava disconnected. Imported activities stay in your history.",
    };
  }
  const error = singleParam(params, "strava_error");
  if (error) {
    return { kind: "error", message: `Strava error: ${error}` };
  }
  return null;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [
    profileRes,
    metricsRes,
    workoutsRes,
    activitiesRes,
    dietRes,
    stravaTokenRes,
    programsRes,
    enrollmentsRes,
    sessionsRes,
    completionsRes,
  ] = await Promise.all([
    supabase.from("profile").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("body_metrics")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(60),
    supabase
      .from("workouts_completed")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(60),
    supabase
      .from("activities")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(60),
    supabase
      .from("diet_log")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(60),
    supabase
      .from("oauth_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "strava")
      .maybeSingle(),
    supabase
      .from("programs")
      .select("*")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("program_enrollments")
      .select("*")
      .eq("user_id", user.id)
      .order("started_on", { ascending: false }),
    supabase.from("program_sessions").select("*"),
    supabase.from("session_completions").select("*"),
  ]);

  const profile = (profileRes.data as ProfileRow | null) ?? null;
  const bodyMetrics = (metricsRes.data as BodyMetricRow[] | null) ?? [];
  const workoutsCompleted =
    (workoutsRes.data as WorkoutCompletedRow[] | null) ?? [];
  const activities = (activitiesRes.data as ActivityRow[] | null) ?? [];
  const dietLog = (dietRes.data as DietLogRow[] | null) ?? [];
  const stravaToken = (stravaTokenRes.data as OAuthTokenRow | null) ?? null;
  const programs = (programsRes.data as ProgramRow[] | null) ?? [];
  const enrollments =
    (enrollmentsRes.data as ProgramEnrollmentRow[] | null) ?? [];
  const programSessions =
    (sessionsRes.data as ProgramSessionRow[] | null) ?? [];
  const sessionCompletions =
    (completionsRes.data as SessionCompletionRow[] | null) ?? [];

  // Program anchor date: prefer the explicit program_start_date (set
  // via the RESET START button), fall back to profile.created_at, fall
  // back to today for brand-new accounts before the trigger fires.
  const startISO = profile?.program_start_date
    ? `${profile.program_start_date}T00:00:00Z`
    : (profile?.created_at ?? new Date().toISOString());
  const phaseInfo: PhaseInfo = getPhaseInfo(startISO);

  // Latest weight: most recent body_metrics row that has a weight, or fall
  // back to the start weight default.
  const latestWeightLb =
    bodyMetrics.find((m) => m.weight_lb != null)?.weight_lb ??
    USER_DEFAULTS.startWeightLb;

  const goalWeightLb = profile?.weight_goal_lb ?? USER_DEFAULTS.goalWeightLb;
  const startWeightLb = USER_DEFAULTS.startWeightLb;

  const streak = calculateStreak(
    workoutsCompleted.map((w) => ({ date: w.date, completed: w.completed })),
  );

  const email = user.email ?? "—";

  // Today's prescription + completion lookup, for the DASH tab.
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayWorkout = getTodayPrescription(phaseInfo);
  const todayCompleted =
    workoutsCompleted.find((w) => w.date === todayISO)?.completed === true;

  // Today's day-of-week as 1=Monday ... 7=Sunday (matches program_sessions).
  const jsDay = new Date().getDay();
  const todayDayOfWeek = ((jsDay + 6) % 7) + 1;

  // For each active enrollment, find the session at (current_week, today)
  // and pair with any existing completion. Drives the TodayCard overlay.
  const activeEnrollments = enrollments.filter((e) => e.status === "active");
  const todayOverlays: TodayOverlayItem[] = activeEnrollments
    .map((enrollment) => {
      const program = programs.find((p) => p.id === enrollment.program_id);
      if (!program) return null;
      const session = programSessions.find(
        (s) =>
          s.program_id === program.id &&
          s.week === enrollment.current_week &&
          s.day_of_week === todayDayOfWeek,
      );
      if (!session) return null;
      const completion =
        sessionCompletions.find(
          (c) =>
            c.enrollment_id === enrollment.id &&
            c.week === session.week &&
            c.day_of_week === session.day_of_week,
        ) ?? null;
      return {
        enrollmentId: enrollment.id,
        programName: program.name,
        session,
        completion,
      };
    })
    .filter((item): item is TodayOverlayItem => item !== null);

  // Strava connection state for the IMPORT tab.
  const lastStravaSync =
    activities.find((a) => a.source === "strava")?.created_at ?? null;
  const stravaConnection: StravaConnection = stravaToken
    ? {
        connected: true,
        athleteId: stravaToken.athlete_id,
        lastSyncAt: lastStravaSync,
      }
    : { connected: false };

  const params = await searchParams;
  const importFlash = buildImportFlash(params);

  const slots: TabSlots = {
    dash: (
      <DashView
        workout={todayWorkout}
        completed={todayCompleted}
        todayISO={todayISO}
        phaseColor={phaseInfo.phase.color}
        bodyMetrics={bodyMetrics}
        targetWeightLb={goalWeightLb}
        overlays={todayOverlays}
      />
    ),
    weekly: (
      <WeeklyRollup
        workoutsCompleted={workoutsCompleted}
        bodyMetrics={bodyMetrics}
        activities={activities}
        weekNum={phaseInfo.weekNum}
      />
    ),
    diet: (
      <DietPanel
        dietLog={dietLog}
        latestWeightLb={latestWeightLb}
        phaseNum={phaseInfo.phase.num}
      />
    ),
    peptides: <PeptidePanel phaseNum={phaseInfo.phase.num} />,
    import: (
      <ImportPanel
        activities={activities}
        strava={stravaConnection}
        flash={importFlash}
      />
    ),
    programs: (
      <ProgramsPanel
        programs={programs}
        enrollments={enrollments}
        sessions={programSessions}
        completions={sessionCompletions}
      />
    ),
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <DashboardHeader
        email={email}
        phaseInfo={phaseInfo}
        latestWeightLb={latestWeightLb}
        goalWeightLb={goalWeightLb}
        startWeightLb={startWeightLb}
        streak={streak}
      />
      <DashboardShell phaseInfo={phaseInfo} slots={slots} />
      <div className="mt-auto">
        <PhaseStrip
          phaseInfo={phaseInfo}
          programStartDate={profile?.program_start_date ?? null}
        />
      </div>
    </div>
  );
}
