import { CalendarDays, Clock, Heart, MapPin } from "lucide-react";
import type {
  ActivityRow,
  BodyMetricRow,
  WorkoutCompletedRow,
} from "@/lib/operator-types";
import { PanelHeader } from "../Primitives";

const ISO_DATE_LEN = 10;
const DAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"] as const;

function getWeekStartISO(now: Date = new Date()): string {
  const d = new Date(now);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Mon=1..Sun=0 -> back to Mon
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, ISO_DATE_LEN);
}

function buildWeekDates(weekStart: string): string[] {
  const out: string[] = [];
  const start = new Date(`${weekStart}T00:00:00Z`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    out.push(d.toISOString().slice(0, ISO_DATE_LEN));
  }
  return out;
}

function fmtMD(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

type RollupTone = "amber" | "cyan" | "emerald" | "red";

const TONE_COLOR: Record<RollupTone, string> = {
  amber: "var(--color-amber)",
  cyan: "var(--color-cyan)",
  emerald: "var(--color-emerald)",
  red: "var(--color-red)",
};

function BigStat({
  label,
  value,
  sub,
  tone = "amber",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: RollupTone;
}) {
  return (
    <div className="bg-black p-4">
      <div className="mb-1 text-[10px] tracking-widest text-zinc-500">
        {label}
      </div>
      <div className="text-2xl font-bold" style={{ color: TONE_COLOR[tone] }}>
        {value}
      </div>
      {sub && <div className="mt-1 text-[10px] text-zinc-500">{sub}</div>}
    </div>
  );
}

function RollupRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-900 py-1.5 text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className={valueClass ?? "text-zinc-200"}>{value}</span>
    </div>
  );
}

function ActivityRowItem({ a }: { a: ActivityRow }) {
  const distMi =
    a.distance_m != null ? (a.distance_m * 0.000621371).toFixed(1) : "—";
  const durMin = a.duration_s != null ? Math.round(a.duration_s / 60) : null;
  return (
    <div className="grid grid-cols-12 items-center gap-2 border-b border-zinc-900 py-2 text-xs">
      <div className="col-span-2 text-zinc-500">{fmtMD(a.date)}</div>
      <div className="col-span-2 truncate text-zinc-300">{a.sport ?? "—"}</div>
      <div
        className="col-span-2 flex items-center gap-1"
        style={{ color: "var(--color-cyan)" }}
      >
        <Clock className="h-3 w-3" aria-hidden />
        {durMin != null ? `${durMin}m` : "—"}
      </div>
      <div
        className="col-span-2 flex items-center gap-1"
        style={{ color: "var(--color-emerald)" }}
      >
        <MapPin className="h-3 w-3" aria-hidden />
        {distMi}mi
      </div>
      <div
        className="col-span-2 flex items-center gap-1"
        style={{ color: "var(--color-amber)" }}
      >
        <Heart className="h-3 w-3" aria-hidden />
        {a.avg_hr ?? "—"}
      </div>
      <div className="col-span-2 text-right text-[10px] text-zinc-500">
        {a.source}
      </div>
    </div>
  );
}

export function WeeklyRollup({
  workoutsCompleted,
  bodyMetrics,
  activities,
  weekNum,
}: {
  workoutsCompleted: WorkoutCompletedRow[];
  bodyMetrics: BodyMetricRow[];
  activities: ActivityRow[];
  weekNum: number;
}) {
  const weekStart = getWeekStartISO();
  const weekDates = buildWeekDates(weekStart);
  const weekDateSet = new Set(weekDates);
  const todayISO = new Date().toISOString().slice(0, ISO_DATE_LEN);

  const completedSet = new Set(
    workoutsCompleted
      .filter((w) => w.completed && weekDateSet.has(w.date))
      .map((w) => w.date),
  );
  const completedCount = completedSet.size;

  const importsThisWeek = activities.filter((a) => weekDateSet.has(a.date));
  const totalMinutes = importsThisWeek.reduce(
    (acc, a) => acc + (a.duration_s ?? 0) / 60,
    0,
  );
  const totalMiles = importsThisWeek.reduce(
    (acc, a) => acc + (a.distance_m ?? 0) * 0.000621371,
    0,
  );
  const totalCalories = importsThisWeek.reduce(
    (acc, a) => acc + (a.calories ?? 0),
    0,
  );

  // body_metrics fetched newest-first; flip for chronological week math.
  const metricsThisWeek = bodyMetrics
    .filter((m) => weekDateSet.has(m.date))
    .slice()
    .reverse();
  const startWeight = metricsThisWeek[0]?.weight_lb ?? null;
  const endWeight =
    metricsThisWeek[metricsThisWeek.length - 1]?.weight_lb ?? null;
  const weekDelta =
    startWeight != null && endWeight != null ? endWeight - startWeight : null;
  const sleepValues = metricsThisWeek
    .map((m) => m.sleep_hours)
    .filter((s): s is number => s != null);
  const avgSleep =
    sleepValues.length > 0
      ? sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length
      : null;

  const workoutCompliance = Math.min(100, (completedCount / 6) * 100);
  const metricCompliance = Math.min(100, (metricsThisWeek.length / 4) * 100);
  const overallCompliance = Math.round(
    (workoutCompliance + metricCompliance) / 2,
  );

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PanelHeader icon={CalendarDays} label={`WEEK ${weekNum} ROLLUP`} />
        <span className="text-[10px] tracking-widest text-zinc-500">
          {weekStart} → {weekDates[6]}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-zinc-900 md:grid-cols-4">
        <BigStat
          label="WORKOUTS"
          value={`${completedCount}/6`}
          sub={`${Math.round(workoutCompliance)}% compliance`}
          tone="amber"
        />
        <BigStat
          label="TRAIN TIME"
          value={`${Math.round(totalMinutes)}m`}
          sub={
            importsThisWeek.length > 0
              ? `${importsThisWeek.length} sessions`
              : "no imports"
          }
          tone="cyan"
        />
        <BigStat
          label="MILES"
          value={totalMiles.toFixed(1)}
          sub={totalCalories ? `${Math.round(totalCalories)} kcal` : ""}
          tone="emerald"
        />
        <BigStat
          label="COMPLIANCE"
          value={`${overallCompliance}%`}
          sub={
            overallCompliance >= 80
              ? "on track"
              : overallCompliance >= 60
                ? "shaky"
                : "regroup"
          }
          tone={
            overallCompliance >= 80
              ? "emerald"
              : overallCompliance >= 60
                ? "amber"
                : "red"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-px bg-zinc-900 lg:grid-cols-2">
        <div className="bg-black p-4">
          <div className="mb-3 text-[10px] tracking-widest text-zinc-500">
            DAILY COMPLETION
          </div>
          <div className="flex h-28 items-end gap-2">
            {weekDates.map((d, i) => {
              const done = completedSet.has(d);
              const isToday = d === todayISO;
              return (
                <div
                  key={d}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div
                    className="w-full transition-all"
                    style={{
                      height: done ? "80%" : "20%",
                      backgroundColor: done
                        ? "var(--color-emerald)"
                        : "#27272a",
                      ...(isToday
                        ? {
                            boxShadow: "inset 0 0 0 1px var(--color-amber)",
                          }
                        : {}),
                    }}
                  />
                  <span
                    className="text-[10px]"
                    style={{
                      color: isToday ? "var(--color-amber)" : "#71717a",
                    }}
                  >
                    {DAY_INITIALS[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2 bg-black p-4">
          <div className="mb-3 text-[10px] tracking-widest text-zinc-500">
            BODY METRICS
          </div>
          <RollupRow
            label="Start of week"
            value={startWeight != null ? `${startWeight} lb` : "—"}
          />
          <RollupRow
            label="Latest"
            value={endWeight != null ? `${endWeight} lb` : "—"}
          />
          <RollupRow
            label="Δ this week"
            value={
              weekDelta != null
                ? `${weekDelta > 0 ? "+" : ""}${weekDelta.toFixed(1)} lb`
                : "—"
            }
            valueClass={
              weekDelta == null
                ? "text-zinc-500"
                : weekDelta < 0
                  ? "text-[var(--color-emerald)]"
                  : weekDelta > 0
                    ? "text-[var(--color-red)]"
                    : "text-zinc-200"
            }
          />
          <RollupRow
            label="Avg sleep"
            value={avgSleep != null ? `${avgSleep.toFixed(1)} h` : "—"}
          />
          <RollupRow label="Logs" value={`${metricsThisWeek.length} entries`} />
        </div>
      </div>

      <div className="border border-zinc-900 bg-black p-4">
        <div className="mb-3 text-[10px] tracking-widest text-zinc-500">
          IMPORTED ACTIVITY THIS WEEK
        </div>
        {importsThisWeek.length === 0 ? (
          <div className="py-4 text-center text-xs text-zinc-600">
            No imports this week. Upload from Garmin/Suunto on the IMPORT tab.
          </div>
        ) : (
          <div className="space-y-1">
            {importsThisWeek.map((a) => (
              <ActivityRowItem key={a.id} a={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
