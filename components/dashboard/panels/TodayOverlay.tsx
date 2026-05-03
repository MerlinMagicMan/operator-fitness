"use client";

import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { SessionViewModal } from "./programs/SessionViewModal";
import type {
  ProgramSessionRow,
  SessionCompletionRow,
} from "@/lib/operator-types";

export type TodayOverlayItem = {
  enrollmentId: string;
  programName: string;
  session: ProgramSessionRow;
  completion: SessionCompletionRow | null;
};

export function TodayOverlay({ items }: { items: TodayOverlayItem[] }) {
  const [selected, setSelected] = useState<TodayOverlayItem | null>(null);

  if (items.length === 0) return null;

  return (
    <>
      <div
        className="space-y-2 border p-3"
        style={{
          borderColor:
            "color-mix(in oklab, var(--color-cyan) 35%, transparent)",
          backgroundColor:
            "color-mix(in oklab, var(--color-cyan) 4%, transparent)",
        }}
      >
        <div
          className="text-[10px] tracking-widest"
          style={{ color: "var(--color-cyan)" }}
        >
          PROGRAM OVERLAYS · TODAY
        </div>
        <ul className="space-y-1.5">
          {items.map((item) => {
            const completed = item.completion !== null;
            return (
              <li key={item.enrollmentId}>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="flex w-full items-start justify-between gap-2 border border-transparent px-1 py-1 text-left text-xs hover:border-zinc-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate text-zinc-100">
                      <ChevronRight
                        className="h-3 w-3 flex-shrink-0 text-zinc-600"
                        aria-hidden
                      />
                      <span className="truncate">
                        {item.session.title ??
                          `${item.programName} · WK ${item.session.week} D${item.session.day_of_week}`}
                      </span>
                    </div>
                    <div className="ml-4 truncate text-[10px] text-zinc-500">
                      {item.programName.toUpperCase()} · WK {item.session.week}
                      {item.session.est_minutes != null
                        ? ` · ~${item.session.est_minutes} min`
                        : ""}
                    </div>
                  </div>
                  {completed && (
                    <Check
                      className="mt-0.5 h-3 w-3 flex-shrink-0"
                      style={{ color: "var(--color-emerald)" }}
                      aria-hidden
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <SessionViewModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        session={selected?.session ?? null}
        enrollmentId={selected?.enrollmentId ?? null}
        existingCompletion={selected?.completion ?? null}
        programName={selected?.programName ?? ""}
      />
    </>
  );
}
