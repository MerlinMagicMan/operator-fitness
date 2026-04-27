import {
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  Mountain,
  RefreshCw,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  type DayPrescription,
  type PhaseColor,
} from "@/lib/operator-constants";
import { markWorkoutCompleteForm } from "@/app/actions/mark-workout-complete";

const ICON_BY_TAG: Record<string, LucideIcon> = {
  Z2: Heart,
  "Z2+": Heart,
  "STR-A": Dumbbell,
  "STR-B": Dumbbell,
  STR: Dumbbell,
  RUN: Footprints,
  LONG: Footprints,
  THR: Zap,
  SPEED: Zap,
  RUCK: Mountain,
  REST: RefreshCw,
  "STR+M": Flame,
  WOD: Flame,
};

const ACCENT_VAR: Record<PhaseColor, string> = {
  amber: "var(--color-amber)",
  cyan: "var(--color-cyan)",
  emerald: "var(--color-emerald)",
};

export function TodayCard({
  workout,
  completed,
  todayISO,
  phaseColor,
}: {
  workout: DayPrescription;
  completed: boolean;
  todayISO: string;
  phaseColor: PhaseColor;
}) {
  const Icon = ICON_BY_TAG[workout.tag] ?? Heart;
  const accent = ACCENT_VAR[phaseColor];

  return (
    <div
      className="space-y-3 border p-4"
      style={{
        borderColor: `color-mix(in oklab, ${accent} 40%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${accent} 5%, transparent)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-zinc-300" aria-hidden />
          <div>
            <div className="font-bold tracking-wide text-zinc-100">
              {workout.name}
            </div>
            <div className="text-xs text-zinc-500">
              {workout.tag} · {workout.duration}
            </div>
          </div>
        </div>
        {completed && (
          <div
            className="flex items-center gap-1 text-xs"
            style={{ color: "var(--color-emerald)" }}
          >
            <Check className="h-3 w-3" aria-hidden /> COMPLETE
          </div>
        )}
      </div>

      <div className="text-xs">
        <div className="mb-1 text-zinc-500">TARGET</div>
        <div className="text-zinc-200">{workout.target}</div>
      </div>

      <div className="text-xs">
        <div className="mb-1 text-zinc-500">PROTOCOL</div>
        <ul className="space-y-1">
          {workout.blocks.map((b, i) => (
            <li key={i} className="flex gap-2 text-zinc-300">
              <ChevronRight
                className="mt-0.5 h-3 w-3 flex-shrink-0 text-zinc-600"
                aria-hidden
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="border-l-2 pl-2 text-xs italic text-zinc-400"
        style={{
          borderLeftColor:
            "color-mix(in oklab, var(--color-amber) 50%, transparent)",
        }}
      >
        {workout.cue}
      </div>

      {!completed && (
        <form action={markWorkoutCompleteForm}>
          <input type="hidden" name="date" value={todayISO} />
          <button
            type="submit"
            className="w-full border py-2 text-xs tracking-widest transition-colors hover:bg-[color-mix(in_oklab,var(--color-emerald)_10%,transparent)]"
            style={{
              borderColor:
                "color-mix(in oklab, var(--color-emerald) 50%, transparent)",
              color: "var(--color-emerald)",
            }}
          >
            MARK COMPLETE
          </button>
        </form>
      )}
    </div>
  );
}
