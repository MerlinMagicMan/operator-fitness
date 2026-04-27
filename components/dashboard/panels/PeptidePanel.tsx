"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronRight, Pill } from "lucide-react";
import {
  PEPTIDE_PROTOCOLS,
  PHASE_PLAN,
  type PeptideEntry,
  type PhaseColor,
} from "@/lib/operator-constants";
import { PanelHeader } from "../Primitives";

type PhaseNum = 1 | 2 | 3;

const PAUSED_STORAGE_KEY = "operator-peptides-paused";

const COLOR_MAP: Record<
  PhaseColor,
  { var: string; bg: string; border: string }
> = {
  amber: {
    var: "var(--color-amber)",
    bg: "color-mix(in oklab, var(--color-amber) 10%, transparent)",
    border: "color-mix(in oklab, var(--color-amber) 40%, transparent)",
  },
  cyan: {
    var: "var(--color-cyan)",
    bg: "color-mix(in oklab, var(--color-cyan) 10%, transparent)",
    border: "color-mix(in oklab, var(--color-cyan) 40%, transparent)",
  },
  emerald: {
    var: "var(--color-emerald)",
    bg: "color-mix(in oklab, var(--color-emerald) 10%, transparent)",
    border: "color-mix(in oklab, var(--color-emerald) 40%, transparent)",
  },
};

function PhaseTabs({
  active,
  setActive,
}: {
  active: PhaseNum;
  setActive: (p: PhaseNum) => void;
}) {
  return (
    <div className="flex gap-px bg-zinc-900">
      {PHASE_PLAN.map((p) => {
        const isActive = p.num === active;
        const c = COLOR_MAP[p.color];
        return (
          <button
            key={p.num}
            type="button"
            onClick={() => setActive(p.num)}
            className="px-3 py-1.5 text-[10px] tracking-widest transition-colors"
            style={
              isActive
                ? {
                    color: c.var,
                    backgroundColor: c.bg,
                    borderTop: `1px solid ${c.border}`,
                    borderRight: `1px solid ${c.border}`,
                    borderBottom: `1px solid ${c.border}`,
                    borderLeft: `1px solid ${c.border}`,
                  }
                : { backgroundColor: "black", color: "#71717a" }
            }
          >
            P{p.num} · {p.name}
          </button>
        );
      })}
    </div>
  );
}

function PeptideCard({
  peptide,
  status,
  onToggle,
}: {
  peptide: PeptideEntry;
  status: "active" | "paused";
  onToggle: () => void;
}) {
  const isActive = status === "active";
  return (
    <div className="grid grid-cols-1 gap-3 bg-black p-4 md:grid-cols-12">
      <div className="md:col-span-3">
        <div
          className="text-sm font-bold tracking-wide"
          style={{ color: "var(--color-amber)" }}
        >
          {peptide.name}
        </div>
        <div className="mt-1 text-[10px] text-zinc-500">{peptide.duration}</div>
        <button
          type="button"
          onClick={onToggle}
          className="mt-2 inline-block border px-2 py-0.5 text-[10px] tracking-widest transition-colors"
          style={{
            color: isActive ? "var(--color-emerald)" : "#71717a",
            borderColor: isActive
              ? "color-mix(in oklab, var(--color-emerald) 40%, transparent)"
              : "#27272a",
            backgroundColor: isActive
              ? "color-mix(in oklab, var(--color-emerald) 10%, transparent)"
              : "transparent",
          }}
        >
          {isActive ? "● ACTIVE" : "○ PAUSED"}
        </button>
      </div>
      <div className="md:col-span-3">
        <div className="mb-1 text-[10px] tracking-widest text-zinc-500">
          DOSE
        </div>
        <div className="text-xs text-zinc-200">{peptide.dose}</div>
      </div>
      <div className="md:col-span-3">
        <div className="mb-1 text-[10px] tracking-widest text-zinc-500">
          ROUTE
        </div>
        <div className="text-xs text-zinc-200">{peptide.route}</div>
      </div>
      <div className="md:col-span-3">
        <div className="mb-1 text-[10px] tracking-widest text-zinc-500">
          PURPOSE
        </div>
        <div className="text-xs text-zinc-300">{peptide.purpose}</div>
      </div>
    </div>
  );
}

export function PeptidePanel({ phaseNum }: { phaseNum: PhaseNum }) {
  const [activePhase, setActivePhase] = useState<PhaseNum>(phaseNum);
  const [paused, setPaused] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  // Hydrate paused set from localStorage on mount.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PAUSED_STORAGE_KEY);
      if (stored) {
        const arr = JSON.parse(stored) as unknown;
        if (Array.isArray(arr)) {
          setPaused(
            new Set(arr.filter((x): x is string => typeof x === "string")),
          );
        }
      }
    } catch {
      // localStorage unavailable or malformed; ignore.
    }
    setHydrated(true);
  }, []);

  const togglePaused = (name: string) => {
    setPaused((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      try {
        window.localStorage.setItem(
          PAUSED_STORAGE_KEY,
          JSON.stringify([...next]),
        );
      } catch {
        // ignore
      }
      return next;
    });
  };

  const protocol = PEPTIDE_PROTOCOLS[activePhase];
  // activePhase is constrained to 1|2|3, so the index is always 0|1|2.
  const phase = PHASE_PLAN[activePhase - 1] ?? PHASE_PLAN[0];
  const titleColor = COLOR_MAP[phase.color].var;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelHeader icon={Pill} label="PEPTIDE PROTOCOLS" />
        <PhaseTabs active={activePhase} setActive={setActivePhase} />
      </div>

      <div
        className="flex items-start gap-3 border p-3"
        style={{
          backgroundColor:
            "color-mix(in oklab, var(--color-amber) 5%, transparent)",
          borderColor:
            "color-mix(in oklab, var(--color-amber) 30%, transparent)",
        }}
      >
        <AlertTriangle
          className="mt-0.5 h-4 w-4 flex-shrink-0"
          style={{ color: "var(--color-amber)" }}
          aria-hidden
        />
        <div
          className="text-xs leading-relaxed"
          style={{
            color: "color-mix(in oklab, var(--color-amber) 80%, white)",
          }}
        >
          <strong>RESEARCH USE ONLY.</strong> These compounds are not
          FDA-approved for athletic performance. Source from reputable vendors
          with COA/HPLC purity. Consult a knowledgeable physician. Cycle, log
          responses, and discontinue if anything&apos;s off.
        </div>
      </div>

      <div className="border border-zinc-900 bg-black p-4">
        <div
          className="mb-2 text-[10px] tracking-widest"
          style={{ color: titleColor }}
        >
          RATIONALE
        </div>
        <div className="text-xs leading-relaxed text-zinc-300">
          {protocol.rationale}
        </div>
      </div>

      <div className="space-y-px bg-zinc-900">
        {protocol.stack.map((p) => {
          const isPaused = hydrated && paused.has(p.name);
          return (
            <PeptideCard
              key={p.name}
              peptide={p}
              status={isPaused ? "paused" : "active"}
              onToggle={() => togglePaused(p.name)}
            />
          );
        })}
      </div>

      <div className="border border-zinc-900 bg-black p-4">
        <div className="mb-2 text-[10px] tracking-widest text-zinc-500">
          PROTOCOL NOTES
        </div>
        <div className="space-y-2">
          {protocol.notes.map((n, i) => (
            <div key={i} className="flex gap-2 text-xs text-zinc-300">
              <ChevronRight
                className="mt-0.5 h-3 w-3 flex-shrink-0 text-zinc-600"
                aria-hidden
              />
              <span>{n}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-[10px] italic tracking-widest text-zinc-600">
        Research compounds. Consult licensed practitioner.
      </div>
    </div>
  );
}
