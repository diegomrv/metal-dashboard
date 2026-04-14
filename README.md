# Metal Dashboard

A polished workout analytics dashboard for [Hevy](https://www.hevyapp.com/) Pro users. Connect your API key to visualize training history, volume, muscle balance, session insights, and PR progression.

Built with TanStack Start, React 19, Tailwind 4, shadcn/ui, and Drizzle. Designed with Linear-grade tightness and Strong.app restraint.

## Features

- **Overview** — workout counts, volume, streaks, e1RM trends
- **Frequency** — weekly cadence and consistency heatmap
- **Volume** — total load, sets per muscle, weekly progression
- **Muscle balance** — distribution, recovery window, categorical color palette
- **Session insights** — per-workout breakdown with intensity and balance scoring
- **Progression** — exercise-level e1RM history and versioned PRs
- **Workout detail** — full set list with previous-session deltas and PR tagging
- **Two modes** — guest (session-only, React Query cache) or authenticated (persisted to SQLite, sync on demand)

## Tech Stack

- **Framework:** TanStack Start (SSR + server functions + file-based routing)
- **UI:** React 19, Tailwind CSS 4, shadcn/ui (preset `b4akz4Fq4I`, mauve base)
- **Charts:** Recharts
- **Database:** SQLite via `better-sqlite3` + Drizzle ORM
- **Auth:** Better Auth (email/password)
- **Tooling:** Biome, Vitest, pnpm
- **Typography:** IBM Plex Sans + Merriweather

## Getting Started

```bash
pnpm install
cp .env.local.example .env.local   # or create manually (see below)
pnpm db:push                        # push schema to SQLite
pnpm dev                            # http://localhost:3000
```

### Environment

Required in `.env.local`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite path (e.g. `dev.db`) |
| `BETTER_AUTH_SECRET` | Generate with `npx -y @better-auth/cli secret` |
| `BETTER_AUTH_URL` | Auth base URL (e.g. `http://localhost:3000`) |
| `ENCRYPTION_KEY` | 32-byte hex, generate with `openssl rand -hex 32` |
| `VITE_POSTHOG_KEY` | PostHog project API key |
| `VITE_POSTHOG_HOST` | PostHog host (optional, EU/self-hosted) |
| `STORAGE_BACKEND` | `local` (default) or `r2` |

## Scripts

```bash
pnpm dev           # Dev server
pnpm build         # Production build
pnpm preview       # Preview production build
pnpm test          # Vitest
pnpm lint          # Biome lint
pnpm format        # Biome format
pnpm check         # Lint + format check
pnpm db:generate   # Generate Drizzle migrations
pnpm db:migrate    # Run migrations
pnpm db:push       # Push schema directly (dev only)
pnpm db:studio     # Drizzle Studio GUI
```

Add shadcn components with `pnpm dlx shadcn@latest add <component>`.

## Project Layout

```
src/
├── routes/              # File-based routes (auto-generates routeTree.gen.ts)
├── components/
│   ├── hevy/            # Dashboard sections (charts, metrics, detail views)
│   └── ui/              # shadcn/ui primitives
├── lib/
│   ├── hevy/            # API client, sync, metrics, types, muscle colors
│   ├── auth.ts          # Better Auth config
│   ├── crypto.ts        # AES-256-GCM helpers
│   └── storage.ts       # Image storage abstraction (local/R2)
├── db/                  # Drizzle schema + client
└── integrations/        # tanstack-query, posthog
```

## Notes

- Hevy API calls are proxied through TanStack server functions to keep the key server-side and avoid CORS.
- `db:push` will drop tables not in `schema.ts` — Better Auth tables (`user`, `session`, `account`, `verification`) sit outside the Drizzle schema, so use `db:generate` + `db:migrate` for production schema changes.
- `src/routeTree.gen.ts` is generated — never edit by hand.
- Path alias `#/*` resolves to `./src/*`.

## License

Private.
