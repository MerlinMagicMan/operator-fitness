"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Apple,
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  Pill,
  Upload,
  type LucideIcon,
} from "lucide-react";
import type { PhaseInfo } from "@/lib/operator-constants";
import { StubPanel } from "./StubPanel";

type TabId = "dash" | "weekly" | "diet" | "peptides" | "import";

const TABS: ReadonlyArray<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "dash", label: "F1 DASH", icon: LayoutDashboard },
  { id: "weekly", label: "F2 WEEK", icon: CalendarDays },
  { id: "diet", label: "F3 DIET", icon: Apple },
  { id: "peptides", label: "F4 PEP", icon: Pill },
  { id: "import", label: "F5 IMPORT", icon: Upload },
];

const STUB_BY_TAB: Record<
  TabId,
  { label: string; icon: LucideIcon; message: string }
> = {
  dash: {
    label: "TODAY'S OPERATION",
    icon: LayoutDashboard,
    message:
      "TodayCard, MetricsPanel, and CoachPanel land in the next commits.",
  },
  weekly: {
    label: "WEEK ROLLUP",
    icon: CalendarDays,
    message: "Weekly rollup with daily completion grid lands in commit 6.",
  },
  diet: {
    label: "NUTRITION",
    icon: Apple,
    message: "Macro bars + meal log + phase guidance land in commit 7.",
  },
  peptides: {
    label: "PEPTIDE PROTOCOLS",
    icon: Pill,
    message: "Phase-tabbed protocol cards land in commit 8.",
  },
  import: {
    label: "ACTIVITY IMPORT",
    icon: Upload,
    message:
      "GPX/TCX/CSV manual import lands in commit 9. Strava OAuth in phase 2C.",
  },
};

export function DashboardShell({ phaseInfo }: { phaseInfo: PhaseInfo }) {
  const [tab, setTab] = useState<TabId>("dash");
  const stub = STUB_BY_TAB[tab];

  return (
    <>
      <TabNav tab={tab} setTab={setTab} />
      {phaseInfo.isTestWeek && (
        <div
          className="flex items-center gap-2 border-b px-4 py-2 text-xs"
          style={{
            backgroundColor:
              "color-mix(in oklab, var(--color-amber) 10%, transparent)",
            borderColor:
              "color-mix(in oklab, var(--color-amber) 30%, transparent)",
            color: "color-mix(in oklab, var(--color-amber) 80%, white)",
          }}
        >
          <AlertTriangle className="h-3 w-3" aria-hidden />
          <span>
            TEST WEEK — retest mile time, body fat, key lifts. Establish
            baseline before phase change.
          </span>
        </div>
      )}
      <StubPanel label={stub.label} icon={stub.icon} message={stub.message} />
    </>
  );
}

function TabNav({ tab, setTab }: { tab: TabId; setTab: (t: TabId) => void }) {
  return (
    <div className="flex items-center gap-px overflow-x-auto border-b border-zinc-800 bg-zinc-950">
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 text-[10px] tracking-widest transition-colors ${
              active
                ? "border-b bg-black text-[var(--color-amber)]"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
            style={
              active ? { borderBottomColor: "var(--color-amber)" } : undefined
            }
          >
            <t.icon className="h-3 w-3" aria-hidden />
            {t.label}
          </button>
        );
      })}
      {tab !== "dash" && (
        <button
          type="button"
          disabled
          className="ml-auto flex items-center gap-2 border-l border-zinc-800 px-4 py-2 text-[10px] tracking-widest text-zinc-700"
          title="Coach drawer lands in commit 10"
        >
          <MessageSquare className="h-3 w-3" aria-hidden />
          ASK COACH
        </button>
      )}
    </div>
  );
}
