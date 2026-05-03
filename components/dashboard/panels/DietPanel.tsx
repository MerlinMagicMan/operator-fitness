"use client";

import { useMemo, useState } from "react";
import { Apple, ChevronRight, Plus, X } from "lucide-react";
import {
  DIET_GUIDANCE,
  USER_DEFAULTS,
  calcMacroTargets,
} from "@/lib/operator-constants";
import type { DietLogRow } from "@/lib/operator-types";
import { PanelHeader } from "../Primitives";
import { DietLogModal } from "./DietLogModal";
import { QuickLogMeal } from "./QuickLogMeal";
import { deleteMealEntryForm } from "@/app/actions/delete-meal-entry";

const MACRO_COLOR: Record<MacroTone, string> = {
  amber: "var(--color-amber)",
  emerald: "var(--color-emerald)",
  cyan: "var(--color-cyan)",
};
type MacroTone = "amber" | "emerald" | "cyan";

function MacroBar({
  label,
  current,
  target,
  unit,
  tone,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  tone: MacroTone;
}) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const over = current > target;
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-[10px] tracking-widest text-zinc-500">
          {label}
        </span>
        <span className="text-zinc-200">
          <span className={over ? "text-[var(--color-red)]" : ""}>
            {Math.round(current)}
          </span>
          <span className="text-zinc-600">
            {" "}
            / {target} {unit}
          </span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden bg-zinc-900">
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: MACRO_COLOR[tone] }}
        />
      </div>
    </div>
  );
}

function SourceDot({ source }: { source: DietLogRow["source"] }) {
  if (source === "usda") {
    return (
      <span
        title="Verified against USDA FoodData Central"
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: "var(--color-cyan)" }}
        aria-label="verified"
      />
    );
  }
  if (source === "estimate") {
    return (
      <span
        title="Estimated by AI"
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: "var(--color-amber)" }}
        aria-label="estimate"
      />
    );
  }
  return (
    <span
      title="Manual entry"
      className="inline-block h-1.5 w-1.5 rounded-full bg-zinc-700"
      aria-label="manual"
    />
  );
}

function MealRow({ entry }: { entry: DietLogRow }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-900 pb-1 text-xs">
      <span className="flex flex-1 items-center gap-1.5 truncate text-zinc-300">
        <SourceDot source={entry.source} />
        <span className="truncate">{entry.meal}</span>
      </span>
      <div className="flex flex-shrink-0 items-center gap-2">
        {entry.calories != null && (
          <span style={{ color: "var(--color-amber)" }}>
            {Math.round(entry.calories)}c
          </span>
        )}
        {entry.protein_g != null && (
          <span style={{ color: "var(--color-emerald)" }}>
            {Math.round(entry.protein_g)}p
          </span>
        )}
        <form action={deleteMealEntryForm}>
          <input type="hidden" name="id" value={entry.id} />
          <button
            type="submit"
            className="text-zinc-700 hover:text-[var(--color-red)]"
            aria-label={`Delete ${entry.meal}`}
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}

export function DietPanel({
  dietLog,
  latestWeightLb,
  phaseNum,
}: {
  dietLog: DietLogRow[];
  latestWeightLb: number;
  phaseNum: 1 | 2 | 3;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const todayISO = new Date().toISOString().slice(0, 10);

  const targets = useMemo(
    () =>
      calcMacroTargets(
        latestWeightLb,
        USER_DEFAULTS.ageYears,
        USER_DEFAULTS.heightInches,
      ),
    [latestWeightLb],
  );

  const todayLog = useMemo(
    () => dietLog.filter((e) => e.date === todayISO),
    [dietLog, todayISO],
  );

  const totals = useMemo(() => {
    return todayLog.reduce(
      (acc, e) => ({
        calories: acc.calories + (e.calories ?? 0),
        protein: acc.protein + (e.protein_g ?? 0),
        carbs: acc.carbs + (e.carbs_g ?? 0),
        fat: acc.fat + (e.fat_g ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [todayLog]);

  const guidance = DIET_GUIDANCE[phaseNum];

  return (
    <div className="space-y-4 p-4">
      <PanelHeader icon={Apple} label="NUTRITION" />

      <div className="grid grid-cols-1 gap-px bg-zinc-900 lg:grid-cols-2">
        <div className="bg-black p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[10px] tracking-widest text-zinc-500">
              TODAY · {todayISO}
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1 text-[10px] tracking-widest hover:opacity-80"
              style={{ color: "var(--color-amber)" }}
            >
              <Plus className="h-3 w-3" aria-hidden /> MANUAL
            </button>
          </div>

          <QuickLogMeal date={todayISO} />

          <MacroBar
            label="CALORIES"
            current={totals.calories}
            target={targets.calories}
            unit="kcal"
            tone="amber"
          />
          <MacroBar
            label="PROTEIN"
            current={totals.protein}
            target={targets.proteinG}
            unit="g"
            tone="emerald"
          />
          <MacroBar
            label="CARBS"
            current={totals.carbs}
            target={targets.carbsG}
            unit="g"
            tone="cyan"
          />
          <MacroBar
            label="FAT"
            current={totals.fat}
            target={targets.fatG}
            unit="g"
            tone="amber"
          />

          <div className="mt-4 border-t border-zinc-900 pt-3">
            <div className="mb-2 text-[10px] tracking-widest text-zinc-500">
              TODAY&apos;S MEALS
            </div>
            {todayLog.length === 0 ? (
              <div className="py-3 text-center text-xs text-zinc-600">
                Log your first meal.
              </div>
            ) : (
              <div className="space-y-1">
                {todayLog.map((e) => (
                  <MealRow key={e.id} entry={e} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-black p-4">
          <div className="mb-2 text-[10px] tracking-widest text-zinc-500">
            PHASE {phaseNum} · {guidance.title}
          </div>
          <div className="mb-4 space-y-2">
            {guidance.bullets.map((b, i) => (
              <div key={i} className="flex gap-2 text-xs text-zinc-300">
                <ChevronRight
                  className="mt-0.5 h-3 w-3 flex-shrink-0 text-zinc-600"
                  aria-hidden
                />
                <span>{b}</span>
              </div>
            ))}
          </div>

          <div className="mb-2 text-[10px] tracking-widest text-zinc-500">
            FOOD STAPLES
          </div>
          <div className="text-xs leading-relaxed text-zinc-400">
            {guidance.foods.join(" · ")}
          </div>

          <div className="mt-4 border-t border-zinc-900 pt-3">
            <div className="mb-2 text-[10px] tracking-widest text-zinc-500">
              CALCULATED TARGETS
            </div>
            <div className="space-y-0.5 text-xs leading-relaxed text-zinc-500">
              <div>
                BMR est:{" "}
                <span className="text-zinc-300">{targets.bmr} kcal</span>
              </div>
              <div>
                TDEE est:{" "}
                <span className="text-zinc-300">{targets.tdee} kcal</span>
              </div>
              <div>
                Deficit:{" "}
                <span className="text-zinc-300">
                  {targets.tdee - targets.calories} kcal
                </span>
              </div>
              <div className="italic text-zinc-600">
                Auto from current weight + Mifflin-St Jeor.
              </div>
            </div>
          </div>
        </div>
      </div>

      <DietLogModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultDate={todayISO}
      />
    </div>
  );
}
