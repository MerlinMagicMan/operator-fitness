import { Clock, Heart, MapPin, Upload } from "lucide-react";
import type { ActivityRow } from "@/lib/operator-types";
import { PanelHeader } from "../Primitives";

function fmtMD(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

function HistoryRow({ a }: { a: ActivityRow }) {
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
      <div className="col-span-2 text-right text-[10px] uppercase text-zinc-500">
        {a.source}
      </div>
    </div>
  );
}

export function ImportPanel({ activities }: { activities: ActivityRow[] }) {
  // activities is fetched newest-first; render as-is.
  return (
    <div className="space-y-4 p-4">
      <PanelHeader icon={Upload} label="ACTIVITY IMPORT" />

      <div
        className="border p-3 text-xs leading-relaxed"
        style={{
          backgroundColor:
            "color-mix(in oklab, var(--color-amber) 5%, transparent)",
          borderColor:
            "color-mix(in oklab, var(--color-amber) 30%, transparent)",
          color: "color-mix(in oklab, var(--color-amber) 80%, white)",
        }}
      >
        <strong>PHASE 2C — Strava OAuth coming.</strong> Manual GPX/TCX/CSV
        upload UI is rendered here for layout fidelity but parsing + write is
        scaffolded behind importManualActivities and not wired client-side yet.
        The import history below reads live from the activities table.
      </div>

      <div className="grid grid-cols-1 gap-px bg-zinc-900 lg:grid-cols-2">
        <div className="space-y-3 bg-black p-4">
          <div className="text-[10px] tracking-widest text-zinc-500">
            FILE UPLOAD · GPX / TCX
          </div>
          <div className="text-xs leading-relaxed text-zinc-400">
            <span style={{ color: "var(--color-amber)" }}>GARMIN:</span>{" "}
            connect.garmin.com → activity → gear icon → Export to GPX or TCX.
            <br />
            <span style={{ color: "var(--color-amber)" }}>SUUNTO:</span> Suunto
            app → activity → share → export GPX. Or sports-tracker.com export.
          </div>
          <div
            aria-disabled
            className="block w-full cursor-not-allowed border-2 border-dashed border-zinc-800 py-3 text-center text-xs tracking-widest text-zinc-600"
          >
            <Upload className="mr-2 inline h-4 w-4" aria-hidden /> MANUAL IMPORT
            — phase 2c
          </div>
        </div>

        <div className="space-y-3 bg-black p-4">
          <div className="text-[10px] tracking-widest text-zinc-500">
            PASTE CSV
          </div>
          <div className="text-xs leading-relaxed text-zinc-400">
            Headers:{" "}
            <span className="text-zinc-300">
              Date, Sport, Duration(min), Distance(mi), AvgHR, Calories
            </span>
          </div>
          <textarea
            disabled
            rows={5}
            placeholder={`Date,Sport,Duration,Distance,AvgHR,Calories
2026-04-26,Run,32.5,3.2,142,420`}
            className="w-full cursor-not-allowed border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-600 placeholder:text-zinc-700"
          />
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed border py-2 text-xs tracking-widest text-zinc-600 disabled:opacity-50"
            style={{
              borderColor:
                "color-mix(in oklab, var(--color-amber) 30%, transparent)",
            }}
          >
            IMPORT CSV — phase 2c
          </button>
        </div>
      </div>

      <div className="border border-zinc-900 bg-black p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[10px] tracking-widest text-zinc-500">
            IMPORT HISTORY
          </div>
          <span className="text-[10px] text-zinc-600">
            {activities.length} total
          </span>
        </div>
        {activities.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-600">
            No imports yet.
          </div>
        ) : (
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {activities.map((a) => (
              <HistoryRow key={a.id} a={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
