"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { X, Check } from "lucide-react";
import { completeSession } from "@/app/actions/complete-session";
import type {
  ActionResult,
  ProgramSessionRow,
  SessionBlock,
  SessionCompletionRow,
} from "@/lib/operator-types";

function blockTone(type: SessionBlock["type"]): string {
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

function describeItem(item: {
  sets?: number | null;
  reps?: number | null;
  duration_s?: number | null;
  tempo?: string | null;
  load?: string | null;
}): string {
  const parts: string[] = [];
  if (item.sets) parts.push(`${item.sets}x`);
  if (item.reps) parts.push(`${item.reps} reps`);
  else if (item.duration_s) parts.push(`${item.duration_s}s`);
  if (item.load) parts.push(item.load);
  if (item.tempo) parts.push(`tempo ${item.tempo}`);
  return parts.join(" · ");
}

export function SessionViewModal({
  open,
  onClose,
  session,
  enrollmentId,
  existingCompletion,
  programName,
}: {
  open: boolean;
  onClose: () => void;
  session: ProgramSessionRow | null;
  enrollmentId: string | null;
  existingCompletion: SessionCompletionRow | null;
  programName: string;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(completeSession, null);

  const initialBlockState = useMemo(() => {
    return existingCompletion?.block_state ?? {};
  }, [existingCompletion]);

  const [blockState, setBlockState] =
    useState<Record<string, Record<string, boolean>>>(initialBlockState);

  useEffect(() => {
    setBlockState(initialBlockState);
  }, [initialBlockState]);

  useEffect(() => {
    if (state && "success" in state) {
      onClose();
    }
  }, [state, onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !session) return null;

  const completed = !!existingCompletion;
  const errorMsg = state && "error" in state ? state.error : null;

  function toggleItem(blockLabel: string, itemIdx: number) {
    setBlockState((prev) => {
      const next = { ...prev };
      const blockMap = { ...(next[blockLabel] ?? {}) };
      const key = String(itemIdx);
      blockMap[key] = !blockMap[key];
      next[blockLabel] = blockMap;
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col border border-zinc-800 bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <div className="flex flex-col">
            <span className="text-[10px] tracking-widest text-zinc-500">
              {programName.toUpperCase()} · WK {session.week} · D
              {session.day_of_week}
            </span>
            <span
              className="text-xs font-bold tracking-widest"
              style={{ color: "var(--color-amber)" }}
            >
              {session.title?.toUpperCase() ?? `SESSION ${session.day_of_week}`}
            </span>
            {session.est_minutes != null && (
              <span className="text-[10px] text-zinc-500">
                ~{session.est_minutes} min
              </span>
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

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {session.blocks.map((block, bIdx) => (
            <div key={`${block.label}-${bIdx}`} className="space-y-2">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-1">
                <span
                  className="text-xs font-bold tracking-widest"
                  style={{ color: blockTone(block.type) }}
                >
                  {block.label}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                  {block.type}
                </span>
                {block.name && (
                  <span className="text-xs text-zinc-300">— {block.name}</span>
                )}
              </div>
              <ul className="space-y-1.5">
                {block.items.map((item, iIdx) => {
                  const checked =
                    blockState[block.label]?.[String(iIdx)] === true;
                  return (
                    <li key={iIdx} className="flex items-start gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => toggleItem(block.label, iIdx)}
                        disabled={!enrollmentId}
                        aria-label={`Toggle ${item.name}`}
                        className={`mt-0.5 flex h-4 w-4 flex-none items-center justify-center border ${
                          checked
                            ? "border-[var(--color-emerald)] bg-[color-mix(in_oklab,var(--color-emerald)_25%,transparent)]"
                            : "border-zinc-700 bg-black"
                        } disabled:opacity-40`}
                      >
                        {checked && (
                          <Check
                            className="h-3 w-3"
                            style={{ color: "var(--color-emerald)" }}
                            aria-hidden
                          />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="text-zinc-100">{item.name}</div>
                        <div className="text-[10px] text-zinc-500">
                          {describeItem(item)}
                        </div>
                        {item.notes && (
                          <div className="text-[10px] italic text-zinc-500">
                            {item.notes}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {block.notes && (
                <p className="text-[10px] italic text-zinc-500">
                  {block.notes}
                </p>
              )}
            </div>
          ))}
        </div>

        <form
          action={formAction}
          className="space-y-2 border-t border-zinc-800 px-5 py-3"
        >
          <input
            type="hidden"
            name="enrollment_id"
            value={enrollmentId ?? ""}
          />
          <input type="hidden" name="week" value={session.week} />
          <input type="hidden" name="day_of_week" value={session.day_of_week} />
          <input
            type="hidden"
            name="block_state"
            value={JSON.stringify(blockState)}
          />

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              <span className="text-[10px] tracking-widest text-zinc-500">
                RPE
              </span>
              <input
                type="number"
                name="rpe"
                min={0}
                max={10}
                step={0.5}
                disabled={!enrollmentId}
                className="w-16 border border-zinc-800 bg-black px-2 py-1 text-xs text-zinc-100 focus:border-[var(--color-amber)] focus:outline-none disabled:opacity-40"
              />
            </label>
            <input
              type="text"
              name="notes"
              placeholder="notes (optional)"
              disabled={!enrollmentId}
              className="flex-1 border border-zinc-800 bg-black px-2 py-1 text-xs text-zinc-100 focus:border-[var(--color-amber)] focus:outline-none disabled:opacity-40"
            />
          </div>

          {errorMsg && (
            <div
              className="border px-2 py-1 text-[11px]"
              style={{
                backgroundColor:
                  "color-mix(in oklab, var(--color-red) 10%, transparent)",
                borderColor:
                  "color-mix(in oklab, var(--color-red) 30%, transparent)",
                color: "var(--color-red)",
              }}
            >
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            {!enrollmentId ? (
              <span className="text-[10px] text-zinc-500">
                Enroll to track completions.
              </span>
            ) : completed ? (
              <span
                className="flex items-center gap-1 text-[10px] tracking-widest"
                style={{ color: "var(--color-emerald)" }}
              >
                <Check className="h-3 w-3" aria-hidden />
                COMPLETED
              </span>
            ) : (
              <span className="text-[10px] text-zinc-500">
                Check off items as you go.
              </span>
            )}
            <button
              type="submit"
              disabled={!enrollmentId || pending}
              className="border px-4 py-2 text-xs tracking-widest disabled:opacity-50"
              style={{
                borderColor: "var(--color-emerald)",
                color: "var(--color-emerald)",
              }}
            >
              {pending ? "SAVING…" : completed ? "UPDATE" : "MARK COMPLETE"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
