import { Check } from "lucide-react";
import { PHASE_PLAN, type PhaseInfo } from "@/lib/operator-constants";
import { accentColor } from "./Primitives";
import { ResetProgramStartButton } from "./ResetProgramStartButton";

/**
 * Three-column phase summary that lives at the bottom of the
 * dashboard. The current phase is highlighted with its accent color.
 * Footer line shows the program anchor date + a RESET START control
 * for re-zeroing the counters.
 */
export function PhaseStrip({
  phaseInfo,
  programStartDate,
}: {
  phaseInfo: PhaseInfo;
  programStartDate: string | null;
}) {
  const currentNum = phaseInfo.phase.num;
  const weekNum = phaseInfo.weekNum;

  return (
    <div className="border-t border-zinc-800">
      <div className="grid grid-cols-1 gap-px bg-zinc-900 md:grid-cols-3">
        {PHASE_PLAN.map((p) => {
          const isActive = p.num === currentNum;
          const isDone = p.num < currentNum;
          const accent = accentColor(p.color);
          return (
            <div
              key={p.num}
              className="bg-black p-3"
              style={
                isActive
                  ? {
                      backgroundColor: `color-mix(in oklab, ${accent} 10%, transparent)`,
                      borderLeft: `2px solid ${accent}`,
                    }
                  : undefined
              }
            >
              <div className="mb-1 flex items-center gap-2">
                <span
                  className="text-[10px] tracking-widest"
                  style={{
                    color: isActive ? accent : isDone ? "#71717a" : "#3f3f46",
                  }}
                >
                  P{p.num} · {p.name}
                </span>
                {isDone && (
                  <Check
                    className="h-3 w-3"
                    style={{ color: "var(--color-emerald)" }}
                    aria-hidden
                  />
                )}
                {isActive && (
                  <span className="text-[10px] text-zinc-500">
                    W{weekNum} of {p.weeks}
                  </span>
                )}
              </div>
              <div
                className="text-[10px]"
                style={{ color: isActive ? "#d4d4d8" : "#52525b" }}
              >
                {p.focus}
              </div>
              <div
                className="mt-1 text-[10px]"
                style={{ color: isActive ? accent : "#3f3f46" }}
              >
                Target: {p.weightTargetLb} lb
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-zinc-900 bg-black px-4 py-2">
        <span className="text-[10px] tracking-widest text-zinc-600">
          PROGRAM ANCHOR · {programStartDate ?? "—"}
        </span>
        <ResetProgramStartButton currentStartDate={programStartDate} />
      </div>
    </div>
  );
}
