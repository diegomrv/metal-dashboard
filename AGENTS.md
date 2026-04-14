# AGENTS.md

## Mirror Requirement

`AGENTS.md` and `CLAUDE.md` must be kept as mirrors of each other. Any project-level instruction added, removed, or changed in one file must be applied to the other file in the same edit.

## Project Overview

Metal Dashboard is a Hevy workout analytics dashboard built with TanStack Start. Users connect their Hevy Pro API key to visualize training history with charts, metrics, and progression tracking. Supports guest mode (session-only) and authenticated mode (persisted to DB). Local development uses SQLite; Cloudflare deployment uses D1.

## Commands

```bash
pnpm dev              # Dev server on port 3000
pnpm build            # Production build
pnpm preview          # Preview production build
pnpm test             # Run Vitest tests
pnpm lint             # Lint with Biome
pnpm format           # Format with Biome
pnpm check            # Lint + format check
pnpm db:generate      # Generate Drizzle migrations from schema
pnpm db:migrate       # Apply D1 migrations remotely
pnpm db:migrate:local # Apply D1 migrations locally, if using local D1
pnpm db:push          # Push schema directly to database
pnpm db:studio        # Open Drizzle Studio GUI
pnpm cf:deploy        # Deploy to Cloudflare Workers
pnpm cf:typegen       # Refresh Cloudflare binding types
```

Add shadcn components: `pnpm dlx shadcn@latest add <component>`

## Setup

```bash
pnpm install              # May warn about build scripts -- run `pnpm approve-builds` if needed
cp .env.local.example .env.local  # Or create manually with required vars below
pnpm dev
```

## Tech Stack

- **Framework:** TanStack Start (SSR, server functions, file-based routing)
- **UI:** React 19, Tailwind CSS 4, shadcn/ui (radix-lyra style, mauve base, preset `b4akz4Fq4I`)
- **Charts:** Recharts via shadcn chart component
- **Database:** SQLite locally and Cloudflare D1 in production via Drizzle ORM
- **Auth:** Better Auth (email/password)
- **Analytics:** PostHog (provider exists but not actively wired into shell)
- **Linting/Formatting:** Biome (tabs, double quotes, recommended rules)
- **Testing:** Vitest + Testing Library

## Architecture

### Routing (file-based)

Routes live in `src/routes/`. TanStack Router auto-generates `src/routeTree.gen.ts` (never edit this).

- `__root.tsx` - Root shell (html, head, body, devtools). No header/footer -- pages own their layout.
- `index.tsx` - Redirects to `/login`
- `login.tsx` / `register.tsx` - Auth pages
- `connect.tsx` - API key entry (guest + auth modes)
- `dashboard.tsx` - Main dashboard with 6 analytics sections
- `profile.tsx` - Account management (personal info, API key, password, delete)
- `api/auth/$.ts` - Better Auth catch-all handler

### Server Functions

Use `createServerFn` from `@tanstack/react-start` with `.inputValidator()` for input validation (not `.validator()` -- that's deprecated in recent versions). Call them directly from components or route loaders.

### Data Flow

Two modes for Hevy data:

1. **Guest mode** - API key in `sessionStorage`, data held in React Query cache (`staleTime: Infinity`, `gcTime: 30min`). Gone on tab close.
2. **Auth mode** - API key + workout data stored in SQLite locally and D1 on Cloudflare via `src/lib/hevy/sync.ts`. Users sync on demand.

All Hevy API calls are proxied through server functions (`src/lib/hevy/api.ts`) to avoid CORS and keep the API key server-side.

### Hevy Integration

- `src/lib/hevy/types.ts` - TypeScript types for Hevy API models
- `src/lib/hevy/api.ts` - Server functions: paginated fetch for workouts, templates, routines
- `src/lib/hevy/sync.ts` - Server functions: save API key, sync data to DB, load stored data
- `src/lib/hevy/metrics.ts` - Pure functions: volume, frequency, muscle distribution, e1RM, streaks
- `src/lib/hevy/use-hevy-data.ts` - React hook: API key state + React Query orchestration
- `src/components/hevy/` - Dashboard section components (overview, frequency, volume, muscle, progression, recent)

### Database

- Schema: `src/db/schema.ts` (hevy_api_keys, hevy_workouts, hevy_exercise_templates)
- Client: `src/db/index.ts` (SQLite locally, Cloudflare D1 in production)
- Config: `drizzle.config.ts` (SQLite dialect, migrations to `./drizzle/`)

### Key Directories

- `src/components/ui/` - shadcn/ui components (do not manually edit, use `shadcn add`)
- `src/components/hevy/` - Dashboard chart/card components
- `src/lib/` - Utilities, auth config, Hevy integration
- `src/lib/storage.ts` - Image upload abstraction (local/R2)
- `src/lib/crypto.ts` - AES-256-GCM encryption for sensitive data
- `src/db/` - Database schema and client
- `src/integrations/` - Third-party provider wrappers (tanstack-query, posthog)

### Path Aliases

`#/*` resolves to `./src/*`. This is the project convention (shadcn is configured for it).

## Code Style

- **Biome** handles linting and formatting. Tabs for indentation, double quotes.
- Auto-generated files excluded from Biome: `routeTree.gen.ts`, `styles.css`
- TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`
- Run `npx biome check --write` to auto-fix lint + format issues
- Run `npx biome format --write .` to format only

## Code Patterns

- **Cache expensive objects:** Don't re-create crypto keys, DB connections, or parsed configs on every call. Use module-level cached promises (e.g. `let _p: Promise<T> | null = null; const get = () => (_p ??= init());`)
- **Async callbacks in try/finally:** When using `FileReader.onload` or similar callback-based APIs inside async functions, wrap the callback in a `Promise` so `finally` runs after the async work completes, not immediately after the callback is registered
- **Concurrent independent DB operations:** Use `Promise.all` for independent queries/mutations instead of sequential `await`s. Especially important for remote databases (D1) where each await is a round-trip
- **Lightweight queries:** Don't fetch entire datasets when you only need one field. Create dedicated server functions for specific queries (e.g. `getLastSyncAt` instead of `getStoredData` when you only need the timestamp)
- **Eager initialization:** For one-time setup like `mkdirSync({ recursive: true })`, run at module load instead of checking existence on every request. `recursive: true` already no-ops when the dir exists
- **No section divider comments:** Don't use decorative `// --- Section ---` or `// ─── Name ───` dividers. Component/function names are self-documenting. Only add comments that explain non-obvious *why*

## Styling

All styling uses shadcn/ui design tokens via CSS variables in `src/styles.css`. No custom CSS classes beyond `.rise-in` (entry animation).

- **Preset:** `b4akz4Fq4I` (apply with `pnpm dlx shadcn@latest apply b4akz4Fq4I`)
- **Fonts:** IBM Plex Sans (body, `font-sans`), Merriweather (headings, `font-heading` / `font-display`)
- **Colors:** Mauve-based neutrals in oklch format, light/dark mode via `.dark` class
- **Radius:** `0.45rem` base
- **Charts:** Use `--chart-1` through `--chart-5` CSS variables (red/coral palette)

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL` - Local SQLite path (default: `dev.db`)
- `BETTER_AUTH_SECRET` - Generate with `npx -y @better-auth/cli secret`
- `BETTER_AUTH_URL` - Auth base URL for local or production
- `VITE_POSTHOG_KEY` - PostHog project API key
- `VITE_POSTHOG_HOST` - PostHog host (optional, for EU/self-hosted)
- `ENCRYPTION_KEY` - 32-byte hex key for data encryption. Generate: `openssl rand -hex 32`
- `STORAGE_BACKEND` - Image storage: `local` for local dev or `r2` for Cloudflare deployment
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID for D1 admin access and deployment
- `CLOUDFLARE_DATABASE_ID` - D1 database ID for Drizzle admin commands
- `CLOUDFLARE_D1_TOKEN` - Cloudflare API token for Drizzle admin commands

## Gotchas

- `createServerFn` uses `.inputValidator()`, not `.validator()`. The latter silently breaks at runtime.
- `src/routeTree.gen.ts` is auto-generated by TanStack Router on dev/build. Never edit it. If routes look stale, restart the dev server.
- Drizzle config loads env from `.env.local` then `.env` (see `drizzle.config.ts`). If `DATABASE_URL` is set, local SQLite is used for dev commands. Otherwise Drizzle expects `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, and `CLOUDFLARE_D1_TOKEN` for D1 admin commands.
- Hevy API paginates at max 10 items/page (workouts, routines) and 100/page (exercise templates). The server functions handle this automatically.
- Biome schema version in `biome.json` may lag behind the installed CLI. Run `npx biome migrate` if you see a version mismatch warning.
- `pnpm install` may warn about ignored build scripts. Run `pnpm approve-builds` to whitelist them.
- **`pnpm db:push` is a local SQLite convenience** -- use it for local development only. For Cloudflare schema changes, use `db:generate` + `db:migrate`.
- **Cloudflare Workers cannot write to the local filesystem** -- profile image uploads require `STORAGE_BACKEND=r2` in production. Leaving it on `local` is only safe for local development.

## Design Context

### Users
Serious lifters who track workouts with Hevy Pro. They care about their data and want to see training trends, progression, and volume breakdowns. Technical enough to get an API key, likely familiar with fitness tracking apps. Context: reviewing training data at home or between sets.

### Brand Personality
**Polished, confident, functional.** Refined, data-forward, reliable. Premium feel without flashiness.

### Aesthetic Direction
- **References:** Strong.app (clean workout tracker, premium feel) + Linear.app (tight UI, developer-grade polish)
- **Anti-references:** Generic dashboard templates, overly playful fitness apps, AI slop
- **Typography:** IBM Plex Sans (body) + Merriweather (headings)
- **Color:** Mauve oklch neutrals, red/coral chart accents

### Design Principles
1. **Data speaks first** -- every visual element serves the data
2. **Tight and intentional** -- spacing and hierarchy feel deliberate, like Linear
3. **Premium restraint** -- polish from precision, not ornamentation
4. **Fast and responsive** -- interactions feel instant, optimistic UI
5. **Gym-proof** -- works on phone screens between sets
