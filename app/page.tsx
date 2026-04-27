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
  ProfileRow,
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

// Auth-gated; reads the Supabase session per request and pulls the user's
// dashboard data.
export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [profileRes, metricsRes, workoutsRes, activitiesRes, dietRes] =
    await Promise.all([
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
    ]);

  const profile = (profileRes.data as ProfileRow | null) ?? null;
  const bodyMetrics = (metricsRes.data as BodyMetricRow[] | null) ?? [];
  const workoutsCompleted =
    (workoutsRes.data as WorkoutCompletedRow[] | null) ?? [];
  const activities = (activitiesRes.data as ActivityRow[] | null) ?? [];
  const dietLog = (dietRes.data as DietLogRow[] | null) ?? [];

  const startISO = profile?.created_at ?? new Date().toISOString();
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

  const slots: TabSlots = {
    dash: (
      <DashView
        workout={todayWorkout}
        completed={todayCompleted}
        todayISO={todayISO}
        phaseColor={phaseInfo.phase.color}
        bodyMetrics={bodyMetrics}
        targetWeightLb={goalWeightLb}
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
        <PhaseStrip phaseInfo={phaseInfo} />
      </div>
    </div>
  );
}
