import { Activity, MessageSquare, Target } from "lucide-react";
import {
  type DayPrescription,
  type PhaseColor,
} from "@/lib/operator-constants";
import { PanelHeader } from "../Primitives";
import { TodayCard } from "./TodayCard";

/**
 * DASH tab content — three-column grid: TodayCard | METRICS | COACH.
 * METRICS lands in commit 5, COACH in commit 10. Stubs for now.
 */
export function DashView({
  workout,
  completed,
  todayISO,
  phaseColor,
}: {
  workout: DayPrescription;
  completed: boolean;
  todayISO: string;
  phaseColor: PhaseColor;
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
        />
      </section>
      <section className="bg-black p-4 lg:col-span-3">
        <PanelHeader icon={Activity} label="METRICS" />
        <div className="border border-zinc-900 bg-zinc-950 p-6 text-center text-xs text-zinc-500">
          MetricsPanel + LogModal land in commit 5.
        </div>
      </section>
      <section className="flex min-h-[500px] flex-col bg-black p-4 lg:col-span-4">
        <PanelHeader icon={MessageSquare} label="COACH" />
        <div className="flex-1 border border-zinc-900 bg-zinc-950 p-6 text-center text-xs text-zinc-500">
          CoachPanel lands in commit 10.
        </div>
      </section>
    </div>
  );
}
