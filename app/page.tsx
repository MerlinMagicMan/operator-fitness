import { Activity, Database, RefreshCcw, ShieldCheck } from "lucide-react";

type StatusTone = "warn" | "pending";

const tone: Record<StatusTone, string> = {
  warn: "text-[var(--color-red)]",
  pending: "text-[var(--color-cyan)]",
};

const statusGrid: ReadonlyArray<{
  key: string;
  label: string;
  value: string;
  Icon: typeof Database;
  tone: StatusTone;
}> = [
  {
    key: "db",
    label: "DATABASE",
    value: "not connected",
    Icon: Database,
    tone: "warn",
  },
  {
    key: "auth",
    label: "AUTH",
    value: "not configured",
    Icon: ShieldCheck,
    tone: "warn",
  },
  {
    key: "sync",
    label: "SYNC",
    value: "pending phase 2",
    Icon: RefreshCcw,
    tone: "pending",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-5 py-10">
      <header className="flex items-center justify-between border-b border-[var(--color-divider)] pb-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="operator-pulse inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-amber)]"
          />
          <span className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-dim)]">
            OPERATOR
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]">
          phase 1 · foundation
        </span>
      </header>

      <section className="space-y-2">
        <h1 className="text-xl font-semibold text-[var(--color-amber)]">
          OPERATOR — Foundation deployed
        </h1>
        <p className="text-sm text-[var(--color-text-dim)]">
          Deploy verification page. Real dashboard lands once Strava + Withings
          sync is wired in phase 2.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {statusGrid.map(({ key, label, value, Icon, tone: toneKey }) => (
          <div
            key={key}
            className="rounded-md border border-[var(--color-divider)] bg-[var(--color-panel)] p-4"
          >
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-[var(--color-muted)]">
              <span>{label}</span>
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </div>
            <div className={`mt-3 text-sm font-medium ${tone[toneKey]}`}>
              {value}
            </div>
          </div>
        ))}
      </section>

      <footer className="mt-auto flex items-center gap-2 border-t border-[var(--color-divider)] pt-4 text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]">
        <Activity className="h-3 w-3" aria-hidden />
        <span>build · scaffold</span>
      </footer>
    </main>
  );
}
