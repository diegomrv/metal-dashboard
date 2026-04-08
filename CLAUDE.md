# CLAUDE.md

## Project Overview

Metal Dashboard is a Hevy workout analytics dashboard built with TanStack Start. Users connect their Hevy Pro API key to visualize training history with charts, metrics, and progression tracking. Supports guest mode (session-only) and authenticated mode (persisted to DB).

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
pnpm db:migrate       # Run Drizzle migrations
pnpm db:push          # Push schema directly to database
pnpm db:studio        # Open Drizzle Studio GUI
```

Add shadcn components: `pnpm dlx shadcn@latest add <component>`

## Tech Stack

- **Framework:** TanStack Start (SSR, server functions, file-based routing)
- **UI:** React 19, Tailwind CSS 4, shadcn/ui (radix-lyra style, mauve base, preset `b4akz4Fq4I`)
- **Charts:** Recharts via shadcn chart component
- **Database:** SQLite via better-sqlite3 + Drizzle ORM
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
- `hevy/connect.tsx` - API key entry (guest + auth modes)
- `hevy/dashboard.tsx` - Main dashboard with 6 analytics sections
- `api/auth/$.ts` - Better Auth catch-all handler

### Server Functions

Use `createServerFn` from `@tanstack/react-start` with `.inputValidator()` for input validation (not `.validator()` -- that's deprecated in recent versions). Call them directly from components or route loaders.

### Data Flow

Two modes for Hevy data:

1. **Guest mode** - API key in `sessionStorage`, data held in React Query cache (`staleTime: Infinity`, `gcTime: 30min`). Gone on tab close.
2. **Auth mode** - API key + workout data stored in SQLite via `src/lib/hevy/sync.ts`. Users sync on demand.

All Hevy API calls are proxied through server functions (`src/lib/hevy/api.ts`) to avoid CORS and keep the API key server-side.

### Hevy Integration

- `src/lib/hevy/types.ts` - TypeScript types for Hevy API models
- `src/lib/hevy/api.ts` - Server functions: paginated fetch for workouts, templates, routines
- `src/lib/hevy/sync.ts` - Server functions: save API key, sync data to DB, load stored data
- `src/lib/hevy/metrics.ts` - Pure functions: volume, frequency, muscle distribution, e1RM, streaks
- `src/lib/hevy/use-hevy-data.ts` - React hook: API key state + React Query orchestration
- `src/components/hevy/` - Dashboard section components (overview, frequency, volume, muscle, progression, recent)

### Database

- Schema: `src/db/schema.ts` (todos, hevy_api_keys, hevy_workouts, hevy_exercise_templates)
- Client: `src/db/index.ts` (drizzle with better-sqlite3)
- Config: `drizzle.config.ts` (SQLite dialect, migrations to `./drizzle/`)

### Key Directories

- `src/components/ui/` - shadcn/ui components (do not manually edit, use `shadcn add`)
- `src/components/hevy/` - Dashboard chart/card components
- `src/lib/` - Utilities, auth config, Hevy integration
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

## Styling

All styling uses shadcn/ui design tokens via CSS variables in `src/styles.css`. No custom CSS classes beyond `.rise-in` (entry animation).

- **Preset:** `b4akz4Fq4I` (apply with `pnpm dlx shadcn@latest apply b4akz4Fq4I`)
- **Fonts:** IBM Plex Sans (body, `font-sans`), Merriweather (headings, `font-heading` / `font-display`)
- **Colors:** Mauve-based neutrals in oklch format, light/dark mode via `.dark` class
- **Radius:** `0.45rem` base
- **Charts:** Use `--chart-1` through `--chart-5` CSS variables (red/coral palette)

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL` - SQLite path (default: `dev.db`)
- `BETTER_AUTH_SECRET` - Generate with `npx -y @better-auth/cli secret`
- `BETTER_AUTH_URL` - Auth base URL (default: `http://localhost:3000`)
- `VITE_POSTHOG_KEY` - PostHog project API key
- `VITE_POSTHOG_HOST` - PostHog host (optional, for EU/self-hosted)
