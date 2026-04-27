# OPERATOR

Personal performance command center for an ex-pro football player transforming
into a CrossFit endurance athlete across a 44-week, 3-phase build.

Bloomberg / war-room aesthetic — dark mode, monospace, dense panels with
amber, cyan, and emerald accents on near-black. Built as a Next.js 15 PWA on
top of Supabase.

> Currently a personal app. Bishop product implications are downstream — the
> data model and patterns here may seed a more general performance product
> later, so keep that in mind when extending.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript strict**
- **Tailwind CSS v4** with a locked war-room palette (zinc-950 / amber-500 /
  cyan-400 / emerald-500 / red-400)
- **Supabase** (Postgres, Auth, RLS) accessed via `@supabase/ssr`
- **next-pwa** for offline-first service worker + manifest
- **Lucide React** icons, **Recharts** for charts
- **pnpm** package manager
- **Husky + commitlint** with Conventional Commits
- **release-please** for semantic versioning

## Prerequisites

- Node.js 20+
- pnpm 9+
- A [Supabase](https://supabase.com) project (URL + anon key + service-role key)
- A [Vercel](https://vercel.com) account for deploys
- Later phases will need: Strava API app, Withings developer app, an Anthropic
  API key (Phase 3)

## Setup

```bash
git clone <this-repo>
cd operator-fitness
pnpm install
cp .env.example .env.local
# Fill in at minimum:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   NEXT_PUBLIC_SITE_URL=http://localhost:3000
pnpm dev
```

The dev server runs at <http://localhost:3000>. The PWA service worker is
**disabled in development** to avoid cache headaches; verify it via
`pnpm build && pnpm start` and check Chrome DevTools → Application → Manifest /
Service Workers.

### Database

Apply the schema once per Supabase project:

```bash
# Using the Supabase CLI
supabase db push

# Or apply the SQL directly
psql "$SUPABASE_DB_URL" -f supabase/schema.sql
```

The schema enables Row Level Security on every table and scopes rows to
`auth.uid()`. A trigger creates a `profile` row automatically when a new
`auth.users` row appears.

### Supabase Auth configuration

Done once per Supabase project, in the dashboard:

1. **Authentication → URL Configuration**
   - **Site URL**: `https://operator-fitness.vercel.app` (or your prod domain)
   - **Redirect URLs**: add **both**
     - `https://operator-fitness.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback`
2. **Authentication → Email Templates** — see "Supabase Email Template
   Configuration" below. **You must edit the templates** or magic-link sign-in
   will fail.

In Vercel, set `NEXT_PUBLIC_SITE_URL` (Production / Preview / Development) to
the URL clients will hit, e.g. `https://operator-fitness.vercel.app`.

### Supabase Email Template Configuration

OPERATOR uses Supabase's **token-hash** flow (`verifyOtp`), not the legacy
`/verify` redirect flow. The default email templates point at Supabase's
`/verify` endpoint, which sets session cookies on `*.supabase.co` instead of
your app's domain — the user clicks the link and lands at OPERATOR
unauthenticated. Fix this by routing the link directly to the Next.js
callback so cookies land on the correct domain.

In **Authentication → Email Templates**, edit two templates:

#### Magic Link

Replace the link href with:

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email
```

#### Confirm signup

Replace the link href with:

```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup
```

`{{ .SiteURL }}` resolves to the **Site URL** you configured above. The
callback route (`app/auth/callback/route.ts`) reads `token_hash` and `type`
from the query string and calls `supabase.auth.verifyOtp()` server-side,
which writes the session cookies on the OPERATOR domain.

### First sign in

1. Make sure `NEXT_PUBLIC_SITE_URL=http://localhost:3000` is set in
   `.env.local` for local dev.
2. `pnpm dev`, then open <http://localhost:3000/login>.
3. Enter your email and submit — a magic link arrives within a few seconds.
4. Click the link on the same device. The OPERATOR callback verifies the
   token-hash and sets the session cookie; you land on the dashboard signed
   in.
5. The `profile` trigger auto-creates your `profile` row on first sign-in;
   no manual setup required.

## Scripts

| Command             | What it does                             |
| ------------------- | ---------------------------------------- |
| `pnpm dev`          | Next dev server (PWA disabled)           |
| `pnpm build`        | Production build (writes service worker) |
| `pnpm start`        | Serve the production build               |
| `pnpm lint`         | `next lint`                              |
| `pnpm format`       | Prettier write across the repo           |
| `pnpm format:check` | Prettier check (CI / pre-commit)         |

## Build phase plan

### Phase 1 — Foundation _(this commit)_

- Next.js 15 + Tailwind v4 + TS strict scaffolding
- PWA shell, manifest, placeholder icons
- Supabase SSR client factories (no live connection yet)
- `supabase/schema.sql` with 5 tables + RLS
- Husky + commitlint + Prettier + ESLint + release-please

### Phase 2A — Auth _(this commit)_

- Email magic-link sign-in via Supabase Auth (`@supabase/ssr` cookie-based
  sessions)
- `middleware.ts` refreshes the session on every request and gates protected
  routes — unauthenticated users are bounced to `/login`
- `/login` page (war-room aesthetic, server action) → magic link →
  `/auth/callback` exchanges the code → dashboard
- `/auth/sign-out` route handler clears the session
- Single-user mode: any email can sign up. Allow-lists / invite codes wait
  until/if this turns into a Bishop product.

### Phase 2B — Sync

- Strava OAuth + activity import → `activities`
- Withings OAuth + body composition import → `body_metrics`
- Vercel cron jobs for scheduled syncs
- Manual entry forms for diet, peptide protocols, workout overrides
- Port the artifact's `TodayCard`, `MetricsPanel`, `WeeklyRollup`, `DietPanel`,
  `PeptidePanel`, `ImportPanel` components onto live data

### Phase 3 — Coach + polish

- Anthropic-powered `CoachPanel` (Claude API integration)
- Workout templates + peptide protocols + diet calculations
- Test coverage strategy (defined here, not earlier)
- Visual polish, motion, and edge-case handling

## Deploy

Push to `main` → Vercel deploys. Set the same env vars from `.env.example` in
the Vercel project. `vercel.json` carries a phase-2 cron stub (currently disabled
under `_phase2_crons_stub`) that will be renamed to `crons` once the sync route
handlers exist.

## Conventions

- Conventional Commits (`feat:`, `fix:`, `chore:`, etc.) — enforced by
  `commit-msg` hook.
- `pre-commit` hook runs Prettier check + `next lint`.
- Releases land via release-please PRs against `main`.
