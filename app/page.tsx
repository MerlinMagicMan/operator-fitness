import { redirect } from "next/navigation";
import {
  Activity,
  Database,
  LogOut,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// Auth-gated page; reads the Supabase session per request.
export const dynamic = "force-dynamic";

type StatusTone = "warn" | "pending" | "success";

const tone: Record<StatusTone, string> = {
  warn: "text-[var(--color-red)]",
  pending: "text-[var(--color-cyan)]",
  success: "text-[var(--color-emerald)]",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensive — middleware should have already redirected unauthenticated
  // requests to /login, but this guards against misconfigured matchers.
  if (!user) {
    redirect("/login");
  }

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
      value: "schema applied",
      Icon: Database,
      tone: "success",
    },
    {
      key: "auth",
      label: "AUTH",
      value: `signed in · ${user.email ?? "unknown"}`,
      Icon: ShieldCheck,
      tone: "success",
    },
    {
      key: "sync",
      label: "SYNC",
      value: "pending phase 2b",
      Icon: RefreshCcw,
      tone: "pending",
    },
  ];

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
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]">
            phase 2a · auth
          </span>
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-divider)] px-2.5 py-1 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-dim)] transition hover:border-[var(--color-amber)] hover:text-[var(--color-amber)]"
            >
              <LogOut className="h-3 w-3" aria-hidden />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="space-y-2">
        <h1 className="text-xl font-semibold text-[var(--color-amber)]">
          OPERATOR — Foundation deployed
        </h1>
        <p className="text-sm text-[var(--color-text-dim)]">
          Auth wired. Real dashboard lands once Strava + Withings sync is wired
          in phase 2b.
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
            <div
              className={`mt-3 break-all text-sm font-medium ${tone[toneKey]}`}
            >
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
