"use client";

import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Apple,
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  MessageSquare,
  Pill,
  Upload,
  User,
  type LucideIcon,
} from "lucide-react";
import type { PhaseInfo } from "@/lib/operator-constants";
import { StubPanel } from "./StubPanel";
import { ChatProvider } from "./coach/ChatContext";
import { CoachDrawer } from "./coach/CoachDrawer";

export type TabId =
  | "dash"
  | "weekly"
  | "diet"
  | "peptides"
  | "import"
  | "programs"
  | "profile";

/** Server-rendered slot content per tab. Tabs without a slot fall back
 *  to the stub placeholder. */
export type TabSlots = Partial<Record<TabId, ReactNode>>;

const TABS: ReadonlyArray<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "dash", label: "F1 DASH", icon: LayoutDashboard },
  { id: "weekly", label: "F2 WEEK", icon: CalendarDays },
  { id: "diet", label: "F3 DIET", icon: Apple },
  { id: "peptides", label: "F4 PEP", icon: Pill },
  { id: "import", label: "F5 IMPORT", icon: Upload },
  { id: "programs", label: "F6 PROG", icon: Dumbbell },
  { id: "profile", label: "F7 PROFILE", icon: User },
];

const STUB_BY_TAB: Record<
  TabId,
  { label: string; icon: LucideIcon; message: string }
> = {
  dash: {
    label: "TODAY'S OPERATION",
    icon: LayoutDashboard,
    message: "Dashboard data unavailable.",
  },
  weekly: {
    label: "WEEK ROLLUP",
    icon: CalendarDays,
    message: "Weekly rollup unavailable.",
  },
  diet: {
    label: "NUTRITION",
    icon: Apple,
    message: "Diet data unavailable.",
  },
  peptides: {
    label: "PEPTIDE PROTOCOLS",
    icon: Pill,
    message: "Peptide protocol unavailable.",
  },
  import: {
    label: "ACTIVITY IMPORT",
    icon: Upload,
    message: "Activity import unavailable.",
  },
  programs: {
    label: "PROGRAMS",
    icon: Dumbbell,
    message: "Programs unavailable.",
  },
  profile: {
    label: "PROFILE & SETTINGS",
    icon: User,
    message: "Profile unavailable.",
  },
};

export function DashboardShell({
  phaseInfo,
  slots = {},
}: {
  phaseInfo: PhaseInfo;
  slots?: TabSlots;
}) {
  const [tab, setTab] = useState<TabId>("dash");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slot = slots[tab];
  const stub = STUB_BY_TAB[tab];

  return (
    <ChatProvider>
      <TabNav
        tab={tab}
        setTab={setTab}
        onCoachOpen={() => setDrawerOpen(true)}
      />
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
      {slot ?? (
        <StubPanel label={stub.label} icon={stub.icon} message={stub.message} />
      )}
      <CoachDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </ChatProvider>
  );
}

function TabNav({
  tab,
  setTab,
  onCoachOpen,
}: {
  tab: TabId;
  setTab: (t: TabId) => void;
  onCoachOpen: () => void;
}) {
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
          onClick={onCoachOpen}
          className="ml-auto flex items-center gap-2 border-l border-zinc-800 px-4 py-2 text-[10px] tracking-widest transition-colors hover:bg-[color-mix(in_oklab,var(--color-cyan)_10%,transparent)]"
          style={{ color: "var(--color-cyan)" }}
        >
          <MessageSquare className="h-3 w-3" aria-hidden />
          ASK COACH
        </button>
      )}
    </div>
  );
}
