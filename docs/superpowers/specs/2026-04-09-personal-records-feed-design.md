# Personal Records Feed + Incremental Sync

## Context

Metal Dashboard currently does a full clear + reinsert of all Hevy workout data on every sync. This is wasteful and prevents append-only data like personal records from persisting across syncs. The Hevy API provides a `/v1/workouts/events` endpoint designed for incremental sync.

This spec covers two tightly coupled changes:
1. **Incremental sync** - use the events endpoint to only fetch new/updated/deleted workouts
2. **Personal records feed** - a new dashboard module showing the most recent PRs (auth-only)

## 1. Incremental Sync

### Current behavior

`syncHevyData` fetches ALL workouts and templates, clears the DB tables, and reinserts everything.

### New behavior

**First sync** (no `lastSyncAt`): fetch all workouts via `GET /v1/workouts` (unchanged).

**Subsequent syncs**: fetch `GET /v1/workouts/events?since=lastSyncAt`.
- `"updated"` events: upsert the workout (insert or replace by `hevyId`)
- `"deleted"` events: delete the workout row by `hevyId`

**Templates**: still full-fetch (no events API available, small dataset, rarely changes).

### New types

```ts
interface WorkoutUpdatedEvent {
  type: "updated";
  workout: Workout;
}

interface WorkoutDeletedEvent {
  type: "deleted";
  id: string;
  deleted_at: string;
}

type WorkoutEvent = WorkoutUpdatedEvent | WorkoutDeletedEvent;
```

### New API function

`fetchWorkoutEvents(apiKey, since)` - paginated fetch of `/v1/workouts/events` with `since` param. Returns all `WorkoutEvent[]` across pages.

### Sync logic changes (`sync.ts`)

```
if lastSyncAt exists:
  events = fetchWorkoutEvents(apiKey, lastSyncAt)
  for each event:
    if "updated": upsert workout row (match on hevyId + userId)
    if "deleted": delete workout row by hevyId + userId
  templates = fetchAllExerciseTemplates (full replace, cheap)
else:
  workouts = fetchAllWorkouts (current behavior)
  templates = fetchAllExerciseTemplates
  clear + insert all (current behavior)

update lastSyncAt
```

### Upsert strategy

Use Drizzle's `onConflictDoUpdate` on a unique constraint `(userId, hevyId)` on `hevy_workouts`. This requires adding a unique index to the table.

## 2. Personal Records Table

### Schema: `hevy_personal_records`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK AUTOINCREMENT | |
| `userId` | TEXT NOT NULL | |
| `exerciseTemplateId` | TEXT NOT NULL | Hevy exercise template ID |
| `exerciseTitle` | TEXT NOT NULL | Denormalized for fast reads |
| `type` | TEXT NOT NULL | `"e1rm"` or `"volume"` |
| `value` | REAL NOT NULL | The record value (e1RM kg or volume kg) |
| `weightKg` | REAL NOT NULL | Actual weight lifted |
| `reps` | INTEGER NOT NULL | Actual reps |
| `workoutId` | TEXT NOT NULL | Hevy workout ID |
| `achievedAt` | TEXT NOT NULL | Workout start_time |
| `previousValue` | REAL | Previous record value (null for first-ever) |

This table is append-only during normal operation. Each row represents a record-breaking event.

## 3. PR Detection Logic

### Definitions

- **e1RM PR**: Epley formula `weight * (1 + reps / 30)`. A new record when this exceeds the previous best for the same exercise.
- **Volume PR**: `weight_kg * reps` for a single set. A new record when this exceeds the previous best for the same exercise.

### Filters

- Only `weight_reps` type exercises (from template)
- Only `normal` and `failure` set types (skip warmups and dropsets)

### First sync (full computation)

1. Sort all workouts chronologically (oldest first)
2. For each workout, for each exercise, for each qualifying set:
   - Compute e1RM and volume
   - Compare against running best for that exercise
   - If it exceeds the running best, insert a PR row with `previousValue` = old best (or null if first)
   - Update running best

### Incremental sync

**Updated workouts:**
1. Query current best e1RM and volume per exercise from PR table (latest row per exercise+type)
2. For each updated workout's qualifying sets, compare against current bests
3. Insert new PR rows for any records broken

**Deleted workouts:**
1. Check if any PR rows reference the deleted workout's ID
2. If yes, delete those PR rows and recompute PRs for the affected exercises from full workout history
3. If no, nothing to do

## 4. Server Functions

### `getRecentPRs(userId, limit)`

Query PR table `ORDER BY achievedAt DESC LIMIT {limit}`. Returns array of PR objects for the feed component.

### `computePersonalRecords(userId)`

Full computation from all stored workouts. Used on first sync only.

### `computeIncrementalPRs(userId, workouts)`

Check new/updated workouts against current bests. Used on incremental sync.

### `handleDeletedWorkoutPRs(userId, deletedWorkoutIds)`

Check for affected PRs and recompute if needed. Used on incremental sync.

## 5. Component: `PersonalRecordsFeed`

### Props

```ts
interface Props {
  userId: string;
}
```

### Data fetching

Calls `getRecentPRs` server function. Uses React Query with key `["hevy", "prs", userId]`, invalidated after sync completes.

### Layout

- Full-width Card after ActivityHeatmap
- Title: "Personal Records"
- Description: "Your most recent record-breaking lifts"
- List of up to 5 PR entries

### Each PR entry shows

- Exercise name (exerciseTitle)
- Type badge: "1RM" or "Volume" (small Badge component)
- The lift: "{weightKg}kg x {reps}"
- Record value: "Est. 1RM: {value}kg" or "Volume: {value}kg"
- Delta: "+{value - previousValue}kg" (green) or "First!" if no previousValue
- Relative date: "3 days ago", "2 months ago"

### States

- **Loading**: skeleton matching the card shape
- **Empty**: "No personal records yet. Sync your data to get started."
- **Auth-only**: component not rendered in guest mode

### Animation

Uses `rise-in` class with appropriate `animationDelay` following the existing pattern.

## 6. Dashboard Layout

```
OverviewCards             global
ActivityHeatmap           global
PersonalRecordsFeed       global, auth-only (NEW)
WorkoutFrequency          time-filtered (future)
MuscleDistribution        time-filtered (future)
VolumeChart               time-filtered (future)
ExerciseProgression       time-filtered (future)
RecentWorkouts            time-filtered (future)
```

The global vs. time-filtered labels are conceptual grouping for future time-range filter work.

## 7. Files to modify

- `src/lib/hevy/types.ts` - add WorkoutEvent types
- `src/lib/hevy/api.ts` - add fetchWorkoutEvents function
- `src/lib/hevy/sync.ts` - incremental sync logic, PR computation, new server functions
- `src/lib/hevy/metrics.ts` - extract/reuse e1RM and volume calculation helpers
- `src/db/schema.ts` - add hevy_personal_records table, add unique index to hevy_workouts
- `src/components/hevy/personal-records-feed.tsx` - new component
- `src/routes/dashboard.tsx` - add PersonalRecordsFeed to layout
- `src/lib/hevy/use-hevy-data.ts` - add PR query for auth mode
