"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Layers, ChevronRight, Check } from "lucide-react";
import type {
  ProgramRow,
  ProgramSessionRow,
  SessionBlock,
  SessionCompletionRow,
} from "@/lib/operator-types";

const DAY_LABEL: Record<number, string> = {
  1: "MON",
  2: "TUE",
  3: "WED",
  4: "THU",
  5: "FRI",
  6: "SAT",
  7: "SUN",
};

function blockTypeColor(type: SessionBlock["type"]): string {
  switch (type) {
    case "warmup":
      return "var(--color-cyan)";
    case "mobility":
      return "var(--color-emerald)";
    case "strength":
      return "var(--color-amber)";
    case "capacity":
      return "var(--color-red)";
    case "cooldown":
      return "var(--color-cyan)";
  }
}

function totalItems(blocks: SessionBlock[]): number {
  return blocks.reduce((acc, b) => acc + b.items.length, 0);
}

export function ProgramDetailModal({
  open,
  onClose,
  program,
  sessions,
  enrollmentId,
  completions,
  onOpenSession,
}: {
  open: boolean;
  onClose: () => void;
  program: ProgramRow | null;
  sessions: ProgramSessionRow[];
  enrollmentId: string | null;
  completions: SessionCompletionRow[];
  onOpenSession: (session: ProgramSessionRow) => void;
}) {
  const [selectedWeek, setSelectedWeek] = useState(1);

  useEffect(() => {
    if (!open) return;
    setSelectedWeek(1);
  }, [open, program?.id]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const weekSessions = useMemo(() => {
    if (!program) return [];
    return sessions
      .filter((s) => s.program_id === program.id && s.week === selectedWeek)
      .sort((a, b) => a.day_of_week - b.day_of_week);
  }, [sessions, program, selectedWeek]);

  const completionLookup = useMemo(() => {
    const map = new Map<string, SessionCompletionRow>();
    for (const c of completions) {
      map.set(`${c.week}:${c.day_of_week}`, c);
    }
    return map;
  }, [completions]);

  if (!open || !program) return null;

  const weeks = Array.from({ length: program.weeks }, (_, i) => i + 1);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col border border-zinc-800 bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Layers
                className="h-3.5 w-3.5"
                style={{ color: "var(--color-amber)" }}
                aria-hidden
              />
              <span className="text-[10px] tracking-widest text-zinc-500">
                PROGRAM
              </span>
            </div>
            <div className="mt-0.5 flex items-baseline gap-3">
              <span
                className="text-sm font-bold tracking-wide"
                style={{ color: "var(--color-amber)" }}
              >
                {program.name.toUpperCase()}
              </span>
              {enrollmentId && (
                <span
                  className="text-[10px] tracking-widest"
                  style={{ color: "var(--color-emerald)" }}
                >
                  ENROLLED
                </span>
              )}
            </div>
            <div className="mt-0.5 text-[10px] text-zinc-500">
              {program.archetype.replace(/_/g, " ").toUpperCase()} ·{" "}
              {program.weeks}w · {program.days_per_week}d/wk
              {program.session_minutes_avg
                ? ` · ~${program.session_minutes_avg} min/session`
                : ""}
            </div>
            {program.equipment.length > 0 && (
              <div className="mt-0.5 text-[10px] text-zinc-500">
                EQUIPMENT: {program.equipment.join(", ")}
              </div>
            )}
            {program.focus_areas.length > 0 && (
              <div className="mt-0.5 text-[10px] text-zinc-500">
                FOCUS: {program.focus_areas.join(", ")}
              </div>
            )}
            {program.description && (
              <div className="mt-1 text-[11px] italic text-zinc-400">
                {program.description}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-zinc-800 px-5 py-2">
          {weeks.map((w) => {
            const isSelected = w === selectedWeek;
            return (
              <button
                key={w}
                type="button"
                onClick={() => setSelectedWeek(w)}
                className="border px-3 py-1 text-[10px] tracking-widest transition-colors"
                style={{
                  borderColor: isSelected
                    ? "var(--color-amber)"
                    : "rgb(39, 39, 42)",
                  color: isSelected
                    ? "var(--color-amber)"
                    : "rgb(161, 161, 170)",
                }}
              >
                W{w}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {weekSessions.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-zinc-500">
              No sessions for week {selectedWeek}.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {weekSessions.map((session) => {
                const completion =
                  enrollmentId !== null
                    ? (completionLookup.get(
                        `${session.week}:${session.day_of_week}`,
                      ) ?? null)
                    : null;
                const isComplete = completion !== null;
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => onOpenSession(session)}
                    className="flex flex-col gap-2 border border-zinc-800 bg-black p-3 text-left transition-colors hover:border-zinc-600"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] tracking-widest"
                            style={{ color: "var(--color-cyan)" }}
                          >
                            {DAY_LABEL[session.day_of_week] ??
                              `D${session.day_of_week}`}
                          </span>
                          {session.est_minutes != null && (
                            <span className="text-[10px] text-zinc-500">
                              ~{session.est_minutes} min
                            </span>
                          )}
                          {isComplete && (
                            <Check
                              className="h-3 w-3"
                              style={{ color: "var(--color-emerald)" }}
                              aria-hidden
                            />
                          )}
                        </div>
                        {session.title && (
                          <div className="mt-0.5 truncate text-xs text-zinc-100">
                            {session.title}
                          </div>
                        )}
                      </div>
                      <ChevronRight
                        className="mt-0.5 h-3 w-3 flex-shrink-0 text-zinc-600"
                        aria-hidden
                      />
                    </div>

                    <ul className="space-y-1">
                      {session.blocks.map((block, bIdx) => (
                        <li
                          key={`${block.label}-${bIdx}`}
                          className="flex items-baseline gap-2 text-[10px]"
                        >
                          <span
                            className="font-bold tracking-widest"
                            style={{ color: blockTypeColor(block.type) }}
                          >
                            {block.label}
                          </span>
                          <span className="truncate text-zinc-400">
                            {block.name ?? block.type}
                          </span>
                          <span className="ml-auto flex-shrink-0 text-zinc-600">
                            {block.items.length}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto text-[10px] text-zinc-600">
                      {session.blocks.length} block
                      {session.blocks.length === 1 ? "" : "s"} ·{" "}
                      {totalItems(session.blocks)} item
                      {totalItems(session.blocks) === 1 ? "" : "s"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
