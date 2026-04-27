import { Mail } from "lucide-react";
import LoginForm from "./LoginForm";

type LoginPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorParam = Array.isArray(params.error)
    ? params.error[0]
    : params.error;
  const callbackError = errorParam ? String(errorParam) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-8 px-5 py-16">
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
          access · sign in
        </span>
      </header>

      <LoginForm callbackError={callbackError} />

      <footer className="mt-auto flex items-center gap-2 border-t border-[var(--color-divider)] pt-4 text-[10px] uppercase tracking-[0.3em] text-[var(--color-muted)]">
        <Mail className="h-3 w-3" aria-hidden />
        <span>magic link · single-use</span>
      </footer>
    </main>
  );
}
