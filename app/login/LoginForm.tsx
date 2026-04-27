"use client";

import { useActionState } from "react";
import { Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { signInWithEmail, type SignInState } from "./actions";

const initialState: SignInState = { status: "idle" };

export default function LoginForm({
  callbackError,
}: {
  callbackError: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    signInWithEmail,
    initialState,
  );

  if (state.status === "success") {
    return <SuccessPanel email={state.email} />;
  }

  const submitError = state.status === "error" ? state.error : null;

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-[var(--color-amber)]">
          Sign in to OPERATOR
        </h1>
        <p className="text-sm text-[var(--color-text-dim)]">
          Enter your email. We&apos;ll send you a single-use magic link to sign
          in — no password.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-muted)]">
            Email
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            spellCheck={false}
            placeholder="you@example.com"
            disabled={pending}
            className="w-full rounded-md border border-[var(--color-divider)] bg-[var(--color-panel)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-amber)] focus:outline-none focus:ring-1 focus:ring-[var(--color-amber)] disabled:opacity-60"
          />
        </label>

        {callbackError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-[var(--color-red)]/40 bg-black px-3 py-2 text-xs text-[var(--color-red)]"
          >
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            <div className="space-y-1">
              <span className="block text-[10px] uppercase tracking-[0.25em]">
                Auth callback error
              </span>
              <span className="block break-all font-medium text-[var(--color-text)]">
                {callbackError}
              </span>
            </div>
          </div>
        ) : null}

        {submitError ? (
          <p className="text-xs text-[var(--color-red)]">{submitError}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--color-amber)] bg-[var(--color-amber)]/10 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-amber)] transition hover:bg-[var(--color-amber)]/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="h-3.5 w-3.5" aria-hidden />
          {pending ? "Sending…" : "Send magic link"}
        </button>
      </form>
    </section>
  );
}

function SuccessPanel({ email }: { email: string }) {
  return (
    <section className="space-y-5 rounded-md border border-[var(--color-divider)] bg-[var(--color-panel)] p-5">
      <div className="flex items-center gap-2 text-[var(--color-emerald)]">
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        <span className="text-[10px] uppercase tracking-[0.3em]">
          Check your email
        </span>
      </div>
      <p className="text-sm text-[var(--color-text-dim)]">
        We sent a magic link to{" "}
        <span className="text-[var(--color-text)]">{email}</span>. Open it on
        this device to finish signing in.
      </p>
      <p className="text-xs text-[var(--color-muted)]">
        Link expires in 1 hour. Didn&apos;t arrive? Check spam, or reload to
        send another.
      </p>
    </section>
  );
}
