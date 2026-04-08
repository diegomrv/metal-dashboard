# User Profile & Header Dropdown

## Overview

Add a user profile page and replace the dashboard's "Disconnect" button (for authenticated users) with a dropdown menu containing Profile and Log out options. Guest mode keeps the simple "Disconnect" button.

## Route Changes

Move existing routes out of `/hevy/` namespace (brand separation):
- `/hevy/connect` -> `/connect`
- `/hevy/dashboard` -> `/dashboard`
- New: `/profile`

Files to move:
- `src/routes/hevy/connect.tsx` -> `src/routes/connect.tsx`
- `src/routes/hevy/dashboard.tsx` -> `src/routes/dashboard.tsx`
- Delete `src/routes/hevy/` directory after move

Update all internal links and navigations accordingly.

## Dashboard Header Dropdown

**Guest mode:** "Disconnect" button, no change in behavior.

**Authenticated mode:**
- "Synced [timestamp]" text + "Sync" button remain visible (not in dropdown)
- Avatar button (user initials or profile image) opens a dropdown menu:
  - **Profile** -- navigates to `/profile`
  - Separator
  - **Log out** -- signs out via Better Auth, redirects to `/login`

## Profile Page (`/profile`)

Single page with stacked card sections. Centered layout matching auth pages, `max-w-lg` width.

### Personal Info Card
- Avatar with upload button overlay
- Name field (editable)
- Email field (editable)
- Save button

### API Key Card
- Current key shown masked
- Input for new key
- "Validate & Save" button -- validates against Hevy API first, then encrypts and saves
- User can sync from the dashboard later

### Change Password Card
- Current password, new password, confirm new password fields
- "Update Password" button

### Danger Zone Card
- Red-tinted border
- "Delete Account" button
- Confirmation dialog (alert-dialog) explaining: account deleted, workout data kept anonymized
- Requires password to confirm

## Backend Changes

### Better Auth Config (`src/lib/auth.ts`)
- Enable `changePassword` in emailAndPassword plugin
- Add `deleteUser` handler that:
  1. Nullifies `userId` on `hevy_workouts` and `hevy_exercise_templates`
  2. Deletes `hevy_api_keys` for that user
  3. Deletes the user account

### Image Storage (`src/lib/storage.ts`)
- Abstraction with `uploadImage(file)` -> URL, `deleteImage(url)`
- Local mode: save to `public/uploads/`, serve as static files
- R2 mode: upload to Cloudflare R2 bucket
- Switch via `STORAGE_BACKEND` env var (default: `local`)

### Profile Server Functions (`src/lib/profile.ts`)
- `updateProfile({ name, image })` -- calls Better Auth's updateUser
- `updateApiKey({ userId, apiKey })` -- validates against Hevy API, encrypts, saves (reuses existing logic from `sync.ts`)
- `uploadProfileImage({ userId, file })` -- uploads via storage abstraction, returns URL
- `deleteAccount({ userId })` -- anonymizes data, then deletes user

### New shadcn Components
- `dropdown-menu`
- `avatar`
- `alert-dialog`

## Verification

1. Create an account, upload a profile image, verify it persists
2. Change name/email, verify session reflects updates
3. Change API key -- verify validation works, old key replaced (encrypted in DB)
4. Change password -- verify old password required, can log in with new password
5. Delete account -- verify user gone, workout data still in DB with null userId
6. Guest mode -- verify "Disconnect" button still works, no dropdown shown
7. All routes (`/connect`, `/dashboard`, `/profile`) work correctly
8. Old `/hevy/*` routes no longer accessible
