import { LogOut } from "lucide-react";
import { PROGRAM_TOTAL_WEEKS, type PhaseInfo } from "@/lib/operator-constants";
import type { StreakResult } from "@/lib/streak";
import { Stat, accentColor } from "./Primitives";

type DashboardHeaderProps = {
  email: string;
  phaseInfo: PhaseInfo;
  latestWeightLb: number;
  goalWeightLb: number;
  startWeightLb: number;
  streak: StreakResult;
};

const DAY_NAMES_SUN_FIRST = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export function DashboardHeader({
  email,
  phaseInfo,
  latestWeightLb,
  goalWeightLb,
  startWeightLb,
  streak,
}: DashboardHeaderProps) {
  const { phase, weekNum, daysIn, pctComplete } = phaseInfo;
  const weightDelta = startWeightLb - latestWeightLb;
  const dayLabel = DAY_NAMES_SUN_FIRST[new Date().getDay()] ?? "—";
  const phaseAccent = accentColor(phase.color);

  const weightSub =
    weightDelta > 0
      ? `−${weightDelta.toFixed(1)} lb`
      : weightDelta < 0
        ? `+${Math.abs(weightDelta).toFixed(1)} lb`
        : "—";
  const weightSubClass =
    weightDelta > 0
      ? "text-[var(--color-emerald)]"
      : weightDelta < 0
        ? "text-[var(--color-red)]"
        : "text-zinc-500";

  const streakSub =
    streak.longest > streak.current ? `pr ${streak.longest}` : "";

  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="operator-pulse inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--color-amber)" }}
          />
          <span
            className="text-xs font-bold tracking-widest"
            style={{ color: "var(--color-amber)" }}
          >
            OPERATOR
          </span>
        </div>
        <span className="text-zinc-700" aria-hidden>
          │
        </span>
        <Stat
          label="PHASE"
          value={`${phase.num} ${phase.name}`}
          accent={phase.color}
        />
        <Stat label="WEEK" value={`${weekNum}/${PROGRAM_TOTAL_WEEKS}`} />
        <Stat label="DAY" value={`${dayLabel} D${daysIn + 1}`} />
        <Stat
          label="WEIGHT"
          value={`${latestWeightLb} → ${goalWeightLb}`}
          sub={weightSub}
          subClassName={weightSubClass}
        />
        <Stat
          label="STREAK"
          value={`${streak.current}d`}
          sub={streakSub || undefined}
        />
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[10px] tracking-widest text-zinc-500 sm:inline">
            {pctComplete.toFixed(0)}%
          </span>
          <span
            className="hidden truncate text-[10px] tracking-widest text-zinc-500 md:inline"
            title={email}
          >
            {email}
          </span>
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              title="Sign out"
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-zinc-500 transition hover:border-[var(--color-red)] hover:text-[var(--color-red)]"
            >
              <LogOut className="h-3 w-3" aria-hidden />
              Out
            </button>
          </form>
        </div>
      </div>
      <div className="h-px bg-zinc-900">
        <div
          className="h-full transition-all"
          style={{
            width: `${pctComplete}%`,
            backgroundColor: phaseAccent,
          }}
        />
      </div>
    </header>
  );
}
