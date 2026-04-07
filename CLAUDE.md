# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Metal Dashboard is a full-stack React application built with TanStack Start. Currently in starter/scaffold phase with demo routes showcasing each integration.

## Commands

```bash
npm run dev           # Dev server on port 3000
npm run build         # Production build
npm run preview       # Preview production build
npm run test          # Run Vitest tests
npm run lint          # Lint with Biome
npm run format        # Format with Biome
npm run check         # Lint + format check
npm run db:generate   # Generate Drizzle migrations from schema
npm run db:migrate    # Run Drizzle migrations
npm run db:push       # Push schema directly to database
npm run db:studio     # Open Drizzle Studio GUI
```

Add shadcn components with: `pnpm dlx shadcn@latest add <component>`

## Tech Stack

- **Framework:** TanStack Start (SSR, server functions, file-based routing)
- **UI:** React 19, Tailwind CSS 4, shadcn/ui (New York style, zinc base)
- **Database:** SQLite via better-sqlite3 + Drizzle ORM
- **Auth:** Better Auth (email/password, TanStack Start integration)
- **Analytics:** PostHog
- **Linting/Formatting:** Biome (tabs, double quotes, recommended rules)
- **Testing:** Vitest + Testing Library

## Architecture

### Routing (file-based)

Routes live in `src/routes/`. TanStack Router auto-generates `src/routeTree.gen.ts` (never edit this).

- `__root.tsx` - Root layout with shell component, providers (QueryClient, PostHog, theme)
- `api/auth/$.ts` - Better Auth catch-all handler
- `demo/` - Demo pages (safe to delete)

### Server Functions

Use `createServerFn` from `@tanstack/react-start` for server-side logic. Call them directly from components or route loaders. Mutations should call `router.invalidate()` to refetch.

### Data Fetching

Two patterns coexist:
1. **Route loaders** - Data loaded before render via `loader` in route definition, accessed with `Route.useLoaderData()`
2. **React Query** - Client-side fetching via `useQuery`/`useSuspenseQuery`, provider set up in `src/integrations/tanstack-query/`

### Database

- Schema: `src/db/schema.ts` (Drizzle table definitions)
- Client: `src/db/index.ts` (initializes drizzle with better-sqlite3)
- Config: `drizzle.config.ts` (SQLite dialect, migrations to `./drizzle/`)

### Key Directories

- `src/components/` - Shared UI components (Header, Footer, ThemeToggle)
- `src/lib/` - Utilities and config (`auth.ts`, `auth-client.ts`, `utils.ts` with `cn()`)
- `src/db/` - Database schema and client
- `src/integrations/` - Third-party provider wrappers (tanstack-query, posthog, better-auth)

### Path Aliases

Both `#/*` and `@/*` resolve to `./src/*`. Prefer `#/` (shadcn convention for this project).

## Code Style

- **Biome** handles linting and formatting. Tabs for indentation, double quotes.
- Auto-generated files excluded from Biome: `routeTree.gen.ts`, `styles.css`
- TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`

## Design Tokens

Custom theme in `src/styles.css` with CSS variables:
- Colors: sea-ink, lagoon, palm, sand, foam (light/dark mode via `.dark` class)
- Typography: Fraunces (display) + Manrope (body)
- shadcn tokens in oklch format

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL` - SQLite path (default: `dev.db`)
- `BETTER_AUTH_SECRET` - Generate with `npx -y @better-auth/cli secret`
- `BETTER_AUTH_URL` - Auth base URL (default: `http://localhost:3000`)
- `VITE_POSTHOG_KEY` - PostHog project API key
- `VITE_POSTHOG_HOST` - PostHog host (optional, for EU/self-hosted)
