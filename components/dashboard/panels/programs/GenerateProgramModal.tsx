"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles } from "lucide-react";
import type { ProgramArchetype } from "@/lib/programs/types";

const ARCHETYPE_LABELS: Record<ProgramArchetype, string> = {
  bodyweight_mobility: "Bodyweight mobility",
  banded_mobility: "Banded mobility",
  loaded_mobility: "Loaded mobility",
  advanced_loaded_mobility: "Advanced loaded mobility",
  bodyweight_conditioning: "Bodyweight conditioning",
  dynamic_strength: "Dynamic strength",
  functional_sc: "Functional S&C",
  custom: "Custom",
};

const ARCHETYPES = Object.keys(ARCHETYPE_LABELS) as ProgramArchetype[];

function parseList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function GenerateProgramModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [archetype, setArchetype] =
    useState<ProgramArchetype>("loaded_mobility");
  const [weeks, setWeeks] = useState(6);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [sessionMinutes, setSessionMinutes] = useState(30);
  const [equipment, setEquipment] = useState("bands, kettlebell");
  const [focusAreas, setFocusAreas] = useState("hips, t-spine");
  const [constraints, setConstraints] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const body = {
      archetype,
      weeks,
      days_per_week: daysPerWeek,
      session_minutes_target: sessionMinutes,
      equipment: parseList(equipment),
      focus_areas: parseList(focusAreas),
      constraints: constraints.trim() || undefined,
    };

    try {
      const res = await fetch("/api/coach/generate-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? `Request failed with ${res.status}`);
        setSubmitting(false);
        return;
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md space-y-3 border border-zinc-800 bg-zinc-950 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <span
            className="flex items-center gap-2 text-xs font-bold tracking-widest"
            style={{ color: "var(--color-amber)" }}
          >
            <Sparkles className="h-3 w-3" aria-hidden />
            GENERATE PROGRAM
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[10px] tracking-widest text-zinc-500">
              ARCHETYPE
            </span>
            <select
              value={archetype}
              onChange={(e) => setArchetype(e.target.value as ProgramArchetype)}
              className="w-full border border-zinc-800 bg-black px-2 py-1.5 text-xs text-zinc-100 focus:border-[var(--color-amber)] focus:outline-none"
            >
              {ARCHETYPES.map((a) => (
                <option key={a} value={a}>
                  {ARCHETYPE_LABELS[a]}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-3 gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] tracking-widest text-zinc-500">
                WEEKS
              </span>
              <input
                type="number"
                min={1}
                max={12}
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                className="w-full border border-zinc-800 bg-black px-2 py-1.5 text-xs text-zinc-100 focus:border-[var(--color-amber)] focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] tracking-widest text-zinc-500">
                DAYS / WK
              </span>
              <input
                type="number"
                min={1}
                max={7}
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                className="w-full border border-zinc-800 bg-black px-2 py-1.5 text-xs text-zinc-100 focus:border-[var(--color-amber)] focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] tracking-widest text-zinc-500">
                MIN / SESS
              </span>
              <input
                type="number"
                min={5}
                max={240}
                value={sessionMinutes}
                onChange={(e) => setSessionMinutes(Number(e.target.value))}
                className="w-full border border-zinc-800 bg-black px-2 py-1.5 text-xs text-zinc-100 focus:border-[var(--color-amber)] focus:outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-[10px] tracking-widest text-zinc-500">
              EQUIPMENT (comma-separated)
            </span>
            <input
              type="text"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="bands, kettlebell, bench"
              className="w-full border border-zinc-800 bg-black px-2 py-1.5 text-xs text-zinc-100 focus:border-[var(--color-amber)] focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] tracking-widest text-zinc-500">
              FOCUS AREAS (comma-separated)
            </span>
            <input
              type="text"
              value={focusAreas}
              onChange={(e) => setFocusAreas(e.target.value)}
              placeholder="hips, t-spine, shoulders"
              className="w-full border border-zinc-800 bg-black px-2 py-1.5 text-xs text-zinc-100 focus:border-[var(--color-amber)] focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] tracking-widest text-zinc-500">
              CONSTRAINTS (optional)
            </span>
            <textarea
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              rows={2}
              placeholder="e.g. left knee tweaky, avoid deep flexion under load"
              className="w-full border border-zinc-800 bg-black px-2 py-1.5 text-xs text-zinc-100 focus:border-[var(--color-amber)] focus:outline-none"
            />
          </label>

          {error && (
            <div
              className="border px-2 py-1.5 text-[11px]"
              style={{
                backgroundColor:
                  "color-mix(in oklab, var(--color-red) 10%, transparent)",
                borderColor:
                  "color-mix(in oklab, var(--color-red) 30%, transparent)",
                color: "var(--color-red)",
              }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 border border-zinc-700 py-2 text-xs tracking-widest text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 border py-2 text-xs tracking-widest disabled:opacity-50"
              style={{
                borderColor: "var(--color-amber)",
                color: "var(--color-amber)",
              }}
            >
              {submitting ? "GENERATING…" : "GENERATE"}
            </button>
          </div>
          {submitting && (
            <p className="text-[10px] text-zinc-500">
              Coach is drafting your program. This usually takes 30-60 seconds.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
