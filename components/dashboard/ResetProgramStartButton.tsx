"use client";

import { useTransition } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { resetProgramStartForm } from "@/app/actions/reset-program-start";

/**
 * Tiny ghost button rendered under the PhaseStrip. Re-zeroes the
 * program anchor (program_start_date) to today so the dashboard's
 * phase / week / day counters reset to W1 D1. Confirms before firing
 * because it's destructive-ish (your streak doesn't change, but the
 * day counter does).
 */
export function ResetProgramStartButton({
  currentStartDate,
}: {
  currentStartDate: string | null;
}) {
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    const msg =
      "Reset program start to today?\n\n" +
      `Current anchor: ${currentStartDate ?? "(unset, using created_at)"}\n` +
      "Phase/week/day will reset to P1 W1 D1. Logged workouts and " +
      "metrics stay; only the counter moves.";
    if (!window.confirm(msg)) return;
    startTransition(async () => {
      try {
        await resetProgramStartForm();
      } catch (err) {
        const m = err instanceof Error ? err.message : String(err);
        window.alert(`Reset failed: ${m}`);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 text-[10px] tracking-widest text-zinc-600 transition-colors hover:text-[var(--color-amber)] disabled:opacity-50"
      title="Set program_start_date = today"
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      ) : (
        <RotateCcw className="h-3 w-3" aria-hidden />
      )}
      RESET START
    </button>
  );
}
