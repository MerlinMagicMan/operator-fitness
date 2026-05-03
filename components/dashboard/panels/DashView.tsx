import { Activity, MessageSquare, Target } from "lucide-react";
import {
  type DayPrescription,
  type PhaseColor,
} from "@/lib/operator-constants";
import type { BodyMetricRow } from "@/lib/operator-types";
import { PanelHeader } from "../Primitives";
import { TodayCard } from "./TodayCard";
import type { TodayOverlayItem } from "./TodayOverlay";
import { MetricsPanel } from "./MetricsPanel";
import { DashCoachPanel } from "../coach/DashCoachPanel";

/** DASH tab content — three-column grid: TodayCard | Metrics | Coach. */
export function DashView({
  workout,
  completed,
  todayISO,
  phaseColor,
  bodyMetrics,
  targetWeightLb,
  overlays = [],
}: {
  workout: DayPrescription;
  completed: boolean;
  todayISO: string;
  phaseColor: PhaseColor;
  bodyMetrics: BodyMetricRow[];
  targetWeightLb: number;
  overlays?: TodayOverlayItem[];
}) {
  return (
    <div className="grid grid-cols-1 gap-px bg-zinc-900 lg:grid-cols-12">
      <section className="bg-black p-4 lg:col-span-5">
        <PanelHeader icon={Target} label="TODAY'S OPERATION" />
        <TodayCard
          workout={workout}
          completed={completed}
          todayISO={todayISO}
          phaseColor={phaseColor}
          overlays={overlays}
        />
      </section>
      <section className="bg-black p-4 lg:col-span-3">
        <PanelHeader icon={Activity} label="METRICS" />
        <MetricsPanel
          bodyMetrics={bodyMetrics}
          targetWeightLb={targetWeightLb}
        />
      </section>
      <section className="flex min-h-[500px] flex-col bg-black p-4 lg:col-span-4">
        <PanelHeader icon={MessageSquare} label="COACH" />
        <DashCoachPanel />
      </section>
    </div>
  );
}
