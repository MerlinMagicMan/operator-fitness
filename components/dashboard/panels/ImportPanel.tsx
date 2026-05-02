import { Activity, Clock, Heart, MapPin, Upload } from "lucide-react";
import type { ActivityRow } from "@/lib/operator-types";
import { PanelHeader } from "../Primitives";

function fmtMD(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

function fmtRelative(iso: string): string {
  const ageMs = Date.now() - new Date(iso).getTime();
  if (ageMs < 0) return "just now";
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export type StravaConnection =
  | { connected: false }
  | {
      connected: true;
      athleteId: string | null;
      lastSyncAt: string | null;
    };

function ConnectionsSection({ strava }: { strava: StravaConnection }) {
  return (
    <div className="border border-zinc-900 bg-black p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[10px] tracking-widest text-zinc-500">
          CONNECTIONS
        </div>
        <span className="text-[10px] text-zinc-600">
          Garmin & Suunto auto-push to Strava
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <div
            className="flex items-center gap-2 text-sm font-bold tracking-wide"
            style={{ color: "var(--color-amber)" }}
          >
            <Activity className="h-4 w-4" aria-hidden />
            STRAVA
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            Activity sync · daily ~04:00 UTC
          </div>
        </div>

        <div className="md:col-span-5">
          <div className="mb-1 text-[10px] tracking-widest text-zinc-500">
            STATUS
          </div>
          {strava.connected ? (
            <>
              <div
                className="text-xs"
                style={{ color: "var(--color-emerald)" }}
              >
                ● CONNECTED
                {strava.athleteId ? ` · athlete ${strava.athleteId}` : ""}
              </div>
              <div className="mt-1 text-[10px] text-zinc-500">
                {strava.lastSyncAt
                  ? `Last sync: ${fmtRelative(strava.lastSyncAt)}`
                  : "No activities synced yet"}
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-zinc-400">○ NOT CONNECTED</div>
              <div className="mt-1 text-[10px] text-zinc-500">
                Connect Strava to pull every Garmin/Suunto run, ruck, and lift
                into the dashboard automatically.
              </div>
            </>
          )}
        </div>

        <div className="flex items-end md:col-span-4">
          {strava.connected ? (
            <form
              action="/api/strava/disconnect"
              method="post"
              className="w-full"
            >
              <button
                type="submit"
                className="w-full border py-2 text-xs tracking-widest transition-colors hover:bg-[color-mix(in_oklab,var(--color-red)_10%,transparent)]"
                style={{
                  color: "var(--color-red)",
                  borderColor:
                    "color-mix(in oklab, var(--color-red) 50%, transparent)",
                }}
              >
                DISCONNECT
              </button>
            </form>
          ) : (
            <a
              href="/api/strava/connect"
              className="block w-full border py-2 text-center text-xs tracking-widest transition-colors hover:bg-[color-mix(in_oklab,var(--color-amber)_10%,transparent)]"
              style={{
                color: "var(--color-amber)",
                borderColor:
                  "color-mix(in oklab, var(--color-amber) 50%, transparent)",
              }}
            >
              CONNECT STRAVA
            </a>
          )}
        </div>
      </div>
    </div>
  );
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

export function ImportPanel({
  activities,
  strava,
  flash,
}: {
  activities: ActivityRow[];
  strava: StravaConnection;
  flash?: { kind: "success" | "error"; message: string } | null;
}) {
  return (
    <div className="space-y-4 p-4">
      <PanelHeader icon={Upload} label="ACTIVITY IMPORT" />

      {flash && (
        <div
          className="border p-3 text-xs leading-relaxed"
          style={{
            backgroundColor:
              flash.kind === "success"
                ? "color-mix(in oklab, var(--color-emerald) 10%, transparent)"
                : "color-mix(in oklab, var(--color-red) 10%, transparent)",
            borderColor:
              flash.kind === "success"
                ? "color-mix(in oklab, var(--color-emerald) 30%, transparent)"
                : "color-mix(in oklab, var(--color-red) 30%, transparent)",
            color:
              flash.kind === "success"
                ? "var(--color-emerald)"
                : "var(--color-red)",
          }}
        >
          {flash.message}
        </div>
      )}

      <ConnectionsSection strava={strava} />

      <div className="grid grid-cols-1 gap-px bg-zinc-900 lg:grid-cols-2">
        <div className="space-y-3 bg-black p-4">
          <div className="text-[10px] tracking-widest text-zinc-500">
            FILE UPLOAD · GPX / TCX
          </div>
          <div className="text-xs leading-relaxed text-zinc-400">
            Manual file upload is a fallback if Strava is offline or for
            workouts that didn&apos;t make it to a watch. Wired in a later phase
            — for now, connect Strava above.
          </div>
          <div
            aria-disabled
            className="block w-full cursor-not-allowed border-2 border-dashed border-zinc-800 py-3 text-center text-xs tracking-widest text-zinc-600"
          >
            <Upload className="mr-2 inline h-4 w-4" aria-hidden /> MANUAL UPLOAD
            — disabled
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
            IMPORT CSV — disabled
          </button>
        </div>
      </div>

      <div className="border border-zinc-900 bg-black p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[10px] tracking-widest text-zinc-500">
            ACTIVITY HISTORY
          </div>
          <span className="text-[10px] text-zinc-600">
            {activities.length} total
          </span>
        </div>
        {activities.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-600">
            No activities yet. Connect Strava and ride / run / lift — new
            workouts appear here on the next cron tick (~04:00 UTC daily).
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
