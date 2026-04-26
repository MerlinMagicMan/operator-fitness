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
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY at minimum
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

### Phase 2 — Sync

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
