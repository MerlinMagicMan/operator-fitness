"use client";

import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Plus } from "lucide-react";
import type { BodyMetricRow } from "@/lib/operator-types";
import { LogModal } from "./LogModal";

const ISO_DATE_LEN = 10;
const MS_PER_DAY = 86_400_000;

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, ISO_DATE_LEN);
}

type Metric = { date: string; weight_lb: number };

function deriveMetrics(rows: BodyMetricRow[]): Metric[] {
  return rows
    .filter(
      (r): r is BodyMetricRow & { weight_lb: number } => r.weight_lb != null,
    )
    .map((r) => ({ date: r.date, weight_lb: r.weight_lb }));
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function MetricsPanel({
  bodyMetrics,
  targetWeightLb,
}: {
  bodyMetrics: BodyMetricRow[];
  targetWeightLb: number;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  // bodyMetrics is fetched newest-first; chart wants oldest-first.
  const oldestFirst = useMemo(
    () => deriveMetrics(bodyMetrics).slice().reverse(),
    [bodyMetrics],
  );
  const last30 = oldestFirst.slice(-30);
  const chartData = last30.map((m) => ({
    date: formatShortDate(m.date),
    weight: m.weight_lb,
  }));

  const sevenDayAvg = useMemo(() => {
    const cutoff = Date.now() - 7 * MS_PER_DAY;
    const recent = oldestFirst.filter(
      (m) => new Date(m.date).getTime() >= cutoff,
    );
    return avg(recent.map((m) => m.weight_lb));
  }, [oldestFirst]);

  const thirtyDayChange = useMemo(() => {
    if (oldestFirst.length < 2) return null;
    const last = oldestFirst[oldestFirst.length - 1];
    if (!last) return null;
    const cutoff = Date.now() - 30 * MS_PER_DAY;
    const baseline = oldestFirst.find(
      (m) => new Date(m.date).getTime() >= cutoff,
    );
    if (!baseline || baseline === last) return null;
    return last.weight_lb - baseline.weight_lb;
  }, [oldestFirst]);

  const allTimeLow = useMemo(() => {
    if (oldestFirst.length === 0) return null;
    return Math.min(...oldestFirst.map((m) => m.weight_lb));
  }, [oldestFirst]);

  const latestWeight = oldestFirst[oldestFirst.length - 1]?.weight_lb;

  return (
    <>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 border border-zinc-700 py-2 text-xs tracking-widest text-zinc-400 transition-colors hover:border-[var(--color-amber)] hover:text-[var(--color-amber)]"
        >
          <Plus className="h-3 w-3" aria-hidden /> LOG ENTRY
        </button>

        {oldestFirst.length === 0 ? (
          <div className="py-8 text-center text-xs leading-relaxed text-zinc-600">
            No readings yet — log your first weight.
          </div>
        ) : (
          <>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#71717a" }}
                    stroke="#27272a"
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "#71717a" }}
                    stroke="#27272a"
                    domain={["dataMin - 5", "dataMax + 5"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      border: "1px solid #27272a",
                      fontSize: 10,
                    }}
                  />
                  <ReferenceLine
                    y={targetWeightLb}
                    stroke="#10b981"
                    strokeDasharray="2 2"
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 2, fill: "#f59e0b" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <StatRow
              label="7-DAY AVG"
              value={sevenDayAvg != null ? `${sevenDayAvg.toFixed(1)} lb` : "—"}
            />
            <StatRow
              label="30-DAY Δ"
              value={
                thirtyDayChange != null
                  ? `${thirtyDayChange > 0 ? "+" : ""}${thirtyDayChange.toFixed(1)} lb`
                  : "—"
              }
              tone={
                thirtyDayChange == null
                  ? "muted"
                  : thirtyDayChange < 0
                    ? "good"
                    : thirtyDayChange > 0
                      ? "bad"
                      : "muted"
              }
            />
            <StatRow
              label="ALL-TIME LOW"
              value={allTimeLow != null ? `${allTimeLow.toFixed(1)} lb` : "—"}
            />
          </>
        )}
      </div>

      <LogModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultDate={todayISO()}
        defaultWeight={latestWeight}
      />
    </>
  );
}

function StatRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "bad" | "muted";
}) {
  const valueClass =
    tone === "good"
      ? "text-[var(--color-emerald)]"
      : tone === "bad"
        ? "text-[var(--color-red)]"
        : tone === "muted"
          ? "text-zinc-500"
          : "text-zinc-100";
  return (
    <div className="flex items-center justify-between border-b border-zinc-900 py-1.5 text-xs">
      <span className="text-[10px] tracking-widest text-zinc-500">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
