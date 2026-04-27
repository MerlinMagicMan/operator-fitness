import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  USER_DEFAULTS,
  getPhaseInfo,
  type PhaseInfo,
} from "@/lib/operator-constants";
import { calculateStreak } from "@/lib/streak";
import type {
  BodyMetricRow,
  ProfileRow,
  WorkoutCompletedRow,
} from "@/lib/operator-types";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PhaseStrip } from "@/components/dashboard/PhaseStrip";

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

  const [profileRes, metricsRes, workoutsRes, _dietRes] = await Promise.all([
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
  // diet rows fetched here for later panels — silence unused warning until
  // the diet panel ships in commit 7.
  void _dietRes;

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
      <DashboardShell phaseInfo={phaseInfo} />
      <div className="mt-auto">
        <PhaseStrip phaseInfo={phaseInfo} />
      </div>
    </div>
  );
}
