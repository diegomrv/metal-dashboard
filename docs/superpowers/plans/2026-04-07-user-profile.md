# User Profile & Header Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user profile page with account management, replace the dashboard header with a dropdown menu for authenticated users, and move routes out of `/hevy/` namespace.

**Architecture:** Profile page at `/profile` with stacked card sections (personal info, API key, password, danger zone). Dashboard header gets an avatar dropdown for authenticated users (Profile, Log out) while guests keep the simple Disconnect button. Image storage abstracted behind a local/R2 switch. Account deletion anonymizes workout data instead of deleting it.

**Tech Stack:** TanStack Start, Better Auth (changePassword, deleteUser), shadcn (dropdown-menu, avatar, alert-dialog), Drizzle ORM, Web Crypto API (encryption)

---

### Task 1: Move routes out of `/hevy/` namespace

**Files:**
- Move: `src/routes/hevy/connect.tsx` -> `src/routes/connect.tsx`
- Move: `src/routes/hevy/dashboard.tsx` -> `src/routes/dashboard.tsx`
- Delete: `src/routes/hevy/` directory
- Modify: `src/routes/login.tsx`
- Modify: `src/routes/register.tsx`
- Auto-regenerated: `src/routeTree.gen.ts`

- [ ] **Step 1: Move route files**

```bash
mv src/routes/hevy/connect.tsx src/routes/connect.tsx
mv src/routes/hevy/dashboard.tsx src/routes/dashboard.tsx
rm -r src/routes/hevy
```

- [ ] **Step 2: Update route IDs in moved files**

In `src/routes/connect.tsx`, change:
```ts
export const Route = createFileRoute("/hevy/connect")({
```
to:
```ts
export const Route = createFileRoute("/connect")({
```

In `src/routes/dashboard.tsx`, change:
```ts
export const Route = createFileRoute("/hevy/dashboard")({
```
to:
```ts
export const Route = createFileRoute("/dashboard")({
```

- [ ] **Step 3: Update navigation references in moved files**

In `src/routes/connect.tsx`, replace all `/hevy/dashboard` with `/dashboard`:
- Line with `navigate({ to: "/hevy/dashboard" })` (two occurrences in `handleLoadDashboard` and `handleSaveAndSync`)

In `src/routes/dashboard.tsx`, replace all `/hevy/connect` with `/connect`:
- Line with `navigate({ to: "/hevy/connect" })` (two occurrences in redirect and `handleDisconnect`)

- [ ] **Step 4: Update navigation references in auth pages**

In `src/routes/login.tsx`:
- `navigate({ to: "/hevy/connect" })` -> `navigate({ to: "/connect" })`
- `onClick={() => navigate({ to: "/hevy/connect" })}` -> `onClick={() => navigate({ to: "/connect" })}`

In `src/routes/register.tsx`:
- `navigate({ to: "/hevy/connect" })` -> `navigate({ to: "/connect" })`

- [ ] **Step 5: Restart dev server and verify**

```bash
# Stop and restart dev server to regenerate routeTree
pnpm dev
```

Verify: navigate to `/connect`, `/dashboard`, `/login`, `/register`. Confirm `/hevy/connect` and `/hevy/dashboard` are no longer valid.

- [ ] **Step 6: Commit**

```bash
git add src/routes/
git commit -m "refactor: move routes out of /hevy/ namespace

Brand separation -- connect and dashboard now live at /connect and /dashboard."
```

---

### Task 2: Add shadcn components

**Files:**
- Create (via CLI): `src/components/ui/dropdown-menu.tsx`
- Create (via CLI): `src/components/ui/avatar.tsx`
- Create (via CLI): `src/components/ui/alert-dialog.tsx`

- [ ] **Step 1: Install components**

```bash
pnpm dlx shadcn@latest add dropdown-menu avatar alert-dialog
```

- [ ] **Step 2: Verify files exist**

```bash
ls src/components/ui/dropdown-menu.tsx src/components/ui/avatar.tsx src/components/ui/alert-dialog.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/dropdown-menu.tsx src/components/ui/avatar.tsx src/components/ui/alert-dialog.tsx
git commit -m "feat: add dropdown-menu, avatar, alert-dialog shadcn components"
```

---

### Task 3: Dashboard header dropdown for authenticated users

**Files:**
- Create: `src/components/user-menu.tsx`
- Modify: `src/routes/dashboard.tsx`

- [ ] **Step 1: Create the UserMenu component**

Create `src/components/user-menu.tsx`:

```tsx
import { useNavigate } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { authClient } from "#/lib/auth-client";

function getInitials(name?: string | null): string {
	if (!name) return "?";
	return name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function UserMenu() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();

	if (!session?.user) return null;

	const handleLogout = async () => {
		await authClient.signOut();
		navigate({ to: "/login" });
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button type="button" className="rounded-full outline-ring/50 focus-visible:outline-2 focus-visible:outline-offset-2">
					<Avatar className="h-8 w-8 cursor-pointer">
						<AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? "User"} />
						<AvatarFallback className="text-xs">
							{getInitials(session.user.name)}
						</AvatarFallback>
					</Avatar>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
					Profile
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={handleLogout}>
					Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
```

- [ ] **Step 2: Update dashboard header**

In `src/routes/dashboard.tsx`, add the import:

```ts
import { UserMenu } from "#/components/user-menu";
```

Replace the header actions `<div className="flex items-center gap-2">` block. Change from:

```tsx
<div className="flex items-center gap-2">
	{session?.user && (
		<>
			{lastSyncAt && (
				<span className="text-xs text-muted-foreground">
					Synced{" "}
					{new Date(lastSyncAt).toLocaleDateString(undefined, {
						month: "short",
						day: "numeric",
						hour: "numeric",
						minute: "2-digit",
					})}
				</span>
			)}
			<Button
				variant="outline"
				size="sm"
				onClick={handleSync}
				disabled={syncing}
			>
				{syncing ? (
					<span className="flex items-center gap-2">
						<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
						Syncing...
					</span>
				) : (
					"Sync"
				)}
			</Button>
		</>
	)}
	<Button variant="outline" size="sm" onClick={handleDisconnect}>
		Disconnect
	</Button>
</div>
```

To:

```tsx
<div className="flex items-center gap-2">
	{session?.user ? (
		<>
			{lastSyncAt && (
				<span className="text-xs text-muted-foreground">
					Synced{" "}
					{new Date(lastSyncAt).toLocaleDateString(undefined, {
						month: "short",
						day: "numeric",
						hour: "numeric",
						minute: "2-digit",
					})}
				</span>
			)}
			<Button
				variant="outline"
				size="sm"
				onClick={handleSync}
				disabled={syncing}
			>
				{syncing ? (
					<span className="flex items-center gap-2">
						<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
						Syncing...
					</span>
				) : (
					"Sync"
				)}
			</Button>
			<UserMenu />
		</>
	) : (
		<Button variant="outline" size="sm" onClick={handleDisconnect}>
			Disconnect
		</Button>
	)}
</div>
```

- [ ] **Step 3: Verify in browser**

Run `pnpm dev`. Log in, navigate to dashboard:
- Authenticated: see Sync button + avatar dropdown with Profile and Log out
- Guest: see Disconnect button only

- [ ] **Step 4: Commit**

```bash
git add src/components/user-menu.tsx src/routes/dashboard.tsx
git commit -m "feat: add user menu dropdown to dashboard header

Authenticated users see avatar dropdown (Profile, Log out).
Guest users keep the simple Disconnect button."
```

---

### Task 4: Make userId nullable in workout/template tables

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Update schema**

In `src/db/schema.ts`, change the `userId` fields on `hevyWorkouts` and `hevyExerciseTemplates` from `.notNull()` to nullable:

In the `hevyWorkouts` table:
```ts
userId: text("user_id"),
```

In the `hevyExerciseTemplates` table:
```ts
userId: text("user_id"),
```

Leave `hevyApiKeys.userId` as `.notNull().unique()` -- API keys get deleted on account deletion, not anonymized.

- [ ] **Step 2: Push schema changes**

```bash
pnpm db:push
```

- [ ] **Step 3: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: make userId nullable on workout/template tables

Supports account deletion with anonymized data retention."
```

---

### Task 5: Enable Better Auth changePassword and account deletion

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Update Better Auth config**

Replace `src/lib/auth.ts` contents with:

```ts
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";
import { db } from "#/db/index";
import { hevyApiKeys, hevyExerciseTemplates, hevyWorkouts } from "#/db/schema";

export const auth = betterAuth({
	emailAndPassword: {
		enabled: true,
	},
	user: {
		deleteUser: {
			enabled: true,
			beforeDelete: async (user) => {
				// Anonymize workout data -- set userId to null
				await db
					.update(hevyWorkouts)
					.set({ userId: null })
					.where(eq(hevyWorkouts.userId, user.id));
				await db
					.update(hevyExerciseTemplates)
					.set({ userId: null })
					.where(eq(hevyExerciseTemplates.userId, user.id));
				// Delete API key (no need to keep it)
				await db
					.delete(hevyApiKeys)
					.where(eq(hevyApiKeys.userId, user.id));
			},
		},
		changePassword: {
			enabled: true,
		},
	},
	plugins: [tanstackStartCookies()],
});
```

- [ ] **Step 2: Verify dev server starts without errors**

```bash
pnpm dev
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: enable password change and account deletion in Better Auth

Account deletion anonymizes workout data (nullifies userId) and
deletes the stored API key before removing the user."
```

---

### Task 6: Image storage abstraction

**Files:**
- Create: `src/lib/storage.ts`

- [ ] **Step 1: Create storage module**

Create `src/lib/storage.ts`:

```ts
import { createServerFn } from "@tanstack/react-start";
import * as fs from "node:fs";
import * as path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function ensureUploadDir() {
	if (!fs.existsSync(UPLOAD_DIR)) {
		fs.mkdirSync(UPLOAD_DIR, { recursive: true });
	}
}

async function saveLocal(
	fileName: string,
	buffer: Buffer,
): Promise<string> {
	ensureUploadDir();
	const filePath = path.join(UPLOAD_DIR, fileName);
	fs.writeFileSync(filePath, buffer);
	return `/uploads/${fileName}`;
}

async function saveR2(
	fileName: string,
	buffer: Buffer,
): Promise<string> {
	// R2 implementation will be added when deploying to Cloudflare
	// For now, fall back to local
	return saveLocal(fileName, buffer);
}

function isR2() {
	return process.env.STORAGE_BACKEND === "r2";
}

export const uploadProfileImage = createServerFn({ method: "POST" })
	.inputValidator(
		(input: { userId: string; fileName: string; base64: string }) => input,
	)
	.handler(async ({ data }) => {
		const buffer = Buffer.from(data.base64, "base64");
		const ext = path.extname(data.fileName) || ".jpg";
		const safeName = `${data.userId}-${Date.now()}${ext}`;

		const url = isR2()
			? await saveR2(safeName, buffer)
			: await saveLocal(safeName, buffer);

		return { url };
	});
```

- [ ] **Step 2: Add public/uploads to .gitignore**

Append to `.gitignore`:
```
public/uploads/
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/storage.ts .gitignore
git commit -m "feat: add image storage abstraction with local/R2 switch

Local dev saves to public/uploads/, R2 stub ready for Cloudflare deployment."
```

---

### Task 7: Profile page

**Files:**
- Create: `src/routes/profile.tsx`

- [ ] **Step 1: Create the profile route**

Create `src/routes/profile.tsx`:

```tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth-client";
import { fetchWorkoutCount } from "#/lib/hevy/api";
import { saveApiKey } from "#/lib/hevy/sync";
import { uploadProfileImage } from "#/lib/storage";

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	const navigate = useNavigate();
	const { data: session, refetch } = authClient.useSession();

	if (!session?.user) {
		navigate({ to: "/login" });
		return null;
	}

	return (
		<main className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
			<div className="rise-in mb-8">
				<h1 className="font-display text-2xl font-bold">Profile</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Manage your account settings
				</p>
			</div>

			<div className="grid gap-6">
				<PersonalInfoCard user={session.user} onUpdate={refetch} />
				<ApiKeyCard userId={session.user.id} />
				<ChangePasswordCard />
				<DangerZoneCard />
			</div>
		</main>
	);
}

function PersonalInfoCard({
	user,
	onUpdate,
}: {
	user: { id: string; name?: string | null; email: string; image?: string | null };
	onUpdate: () => void;
}) {
	const [name, setName] = useState(user.name ?? "");
	const [email, setEmail] = useState(user.email);
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");

	const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = async () => {
			const base64 = (reader.result as string).split(",")[1];
			const { url } = await uploadProfileImage({
				data: { userId: user.id, fileName: file.name, base64 },
			});
			await authClient.updateUser({ image: url });
			onUpdate();
		};
		reader.readAsDataURL(file);
	};

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setMessage("");
		try {
			await authClient.updateUser({ name });
			onUpdate();
			setMessage("Saved");
		} catch {
			setMessage("Failed to save");
		} finally {
			setLoading(false);
		}
	};

	const initials = name
		? name
				.split(" ")
				.map((p) => p[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: "?";

	return (
		<Card className="rise-in">
			<CardHeader>
				<CardTitle className="text-lg">Personal Info</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSave} className="grid gap-4">
					<div className="flex items-center gap-4">
						<div className="relative">
							<Avatar className="h-16 w-16">
								<AvatarImage src={user.image ?? undefined} alt={name} />
								<AvatarFallback>{initials}</AvatarFallback>
							</Avatar>
							<label
								htmlFor="avatar-upload"
								className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 text-xs text-white opacity-0 transition-opacity hover:opacity-100"
							>
								Edit
							</label>
							<input
								id="avatar-upload"
								type="file"
								accept="image/*"
								className="hidden"
								onChange={handleImageUpload}
							/>
						</div>
						<div className="text-sm text-muted-foreground">
							Click avatar to upload a photo
						</div>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							disabled={loading}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" type="email" value={email} disabled />
						<p className="text-xs text-muted-foreground">
							Email cannot be changed at this time
						</p>
					</div>

					<div className="flex items-center gap-3">
						<Button type="submit" disabled={loading}>
							{loading ? "Saving..." : "Save"}
						</Button>
						{message && (
							<span className="text-sm text-muted-foreground">{message}</span>
						)}
					</div>
				</form>
			</CardContent>
		</Card>
	);
}

function ApiKeyCard({ userId }: { userId: string }) {
	const [key, setKey] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	const handleValidateAndSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!key.trim()) return;

		setLoading(true);
		setError("");
		setMessage("");

		try {
			await fetchWorkoutCount({ data: { apiKey: key.trim() } });
			await saveApiKey({ data: { userId, apiKey: key.trim() } });
			setMessage("Key validated and saved");
			setKey("");
		} catch {
			setError(
				"Invalid API key or Hevy API is unavailable. Make sure you have Hevy Pro.",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="rise-in">
			<CardHeader>
				<CardTitle className="text-lg">API Key</CardTitle>
				<CardDescription>
					Update your Hevy Pro API key. The key is validated before saving.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleValidateAndSave} className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="api-key">New API Key</Label>
						<Input
							id="api-key"
							type="password"
							placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
							value={key}
							onChange={(e) => {
								setKey(e.target.value);
								setError("");
								setMessage("");
							}}
							disabled={loading}
						/>
					</div>

					{error && (
						<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
							<p className="text-sm text-destructive">{error}</p>
						</div>
					)}
					{message && (
						<div className="rounded-md border border-green-500/30 bg-green-500/10 p-3">
							<p className="text-sm text-green-700 dark:text-green-400">
								{message}
							</p>
						</div>
					)}

					<Button type="submit" disabled={loading || !key.trim()}>
						{loading ? "Validating..." : "Validate & Save"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

function ChangePasswordCard() {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			setError("Passwords don't match");
			return;
		}

		setLoading(true);
		setError("");
		setMessage("");

		try {
			const result = await authClient.changePassword({
				currentPassword,
				newPassword,
				revokeOtherSessions: true,
			});
			if (result.error) {
				setError(result.error.message || "Failed to change password");
			} else {
				setMessage("Password updated");
				setCurrentPassword("");
				setNewPassword("");
				setConfirmPassword("");
			}
		} catch {
			setError("Failed to change password");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="rise-in">
			<CardHeader>
				<CardTitle className="text-lg">Change Password</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="current-password">Current Password</Label>
						<Input
							id="current-password"
							type="password"
							value={currentPassword}
							onChange={(e) => setCurrentPassword(e.target.value)}
							disabled={loading}
							required
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="new-password">New Password</Label>
						<Input
							id="new-password"
							type="password"
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							disabled={loading}
							required
							minLength={8}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="confirm-password">Confirm New Password</Label>
						<Input
							id="confirm-password"
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							disabled={loading}
							required
							minLength={8}
						/>
					</div>

					{error && (
						<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
							<p className="text-sm text-destructive">{error}</p>
						</div>
					)}
					{message && (
						<div className="rounded-md border border-green-500/30 bg-green-500/10 p-3">
							<p className="text-sm text-green-700 dark:text-green-400">
								{message}
							</p>
						</div>
					)}

					<Button type="submit" disabled={loading}>
						{loading ? "Updating..." : "Update Password"}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

function DangerZoneCard() {
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleDelete = async () => {
		setLoading(true);
		setError("");
		try {
			const result = await authClient.deleteUser({ password });
			if (result.error) {
				setError(result.error.message || "Failed to delete account");
			} else {
				navigate({ to: "/login" });
			}
		} catch {
			setError("Failed to delete account");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="rise-in border-destructive/30">
			<CardHeader>
				<CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
				<CardDescription>
					Permanently delete your account. Your workout data will be kept
					anonymously for aggregate statistics.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{error && (
					<div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3">
						<p className="text-sm text-destructive">{error}</p>
					</div>
				)}
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button variant="destructive">Delete Account</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete your account?</AlertDialogTitle>
							<AlertDialogDescription>
								This action cannot be undone. Your account and API key will be
								permanently deleted. Your workout data will be kept anonymously.
								Enter your password to confirm.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<div className="grid gap-2 py-2">
							<Label htmlFor="delete-password">Password</Label>
							<Input
								id="delete-password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Enter your password"
							/>
						</div>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDelete}
								disabled={loading || !password}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								{loading ? "Deleting..." : "Delete Account"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</CardContent>
		</Card>
	);
}
```

- [ ] **Step 2: Verify in browser**

Run `pnpm dev`. Log in, navigate to `/profile`:
- Personal info card shows avatar, name, email
- API key card has input and validate button
- Change password card has three fields
- Danger zone card has red border and delete button with confirmation dialog

- [ ] **Step 3: Commit**

```bash
git add src/routes/profile.tsx
git commit -m "feat: add profile page with account management

Personal info, API key update, password change, and account deletion
with anonymized data retention."
```

---

### Task 8: Connect profile back-navigation

**Files:**
- Modify: `src/routes/profile.tsx`

- [ ] **Step 1: Add back link to dashboard**

In `src/routes/profile.tsx`, add `Link` to the imports from `@tanstack/react-router`:

```ts
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
```

Add a back link in the header section, changing:

```tsx
<div className="rise-in mb-8">
	<h1 className="font-display text-2xl font-bold">Profile</h1>
	<p className="mt-1 text-sm text-muted-foreground">
		Manage your account settings
	</p>
</div>
```

To:

```tsx
<div className="rise-in mb-8">
	<Link
		to="/dashboard"
		className="mb-2 inline-block text-sm text-muted-foreground hover:text-foreground"
	>
		&larr; Back to dashboard
	</Link>
	<h1 className="font-display text-2xl font-bold">Profile</h1>
	<p className="mt-1 text-sm text-muted-foreground">
		Manage your account settings
	</p>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/profile.tsx
git commit -m "feat: add back-to-dashboard link on profile page"
```

---

### Task 9: Update CLAUDE.md with new routes

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update routing section**

In `CLAUDE.md`, update the routing section to reflect the new routes:

Change:
```
- `hevy/connect.tsx` - API key entry (guest + auth modes)
- `hevy/dashboard.tsx` - Main dashboard with 6 analytics sections
```

To:
```
- `connect.tsx` - API key entry (guest + auth modes)
- `dashboard.tsx` - Main dashboard with 6 analytics sections
- `profile.tsx` - Account management (personal info, API key, password, delete)
```

Also add to Key Directories:
```
- `src/lib/storage.ts` - Image upload abstraction (local/R2)
- `src/lib/crypto.ts` - AES-256-GCM encryption for sensitive data
```

- [ ] **Step 2: Update environment variables section**

Add to the environment variables section:
```
- `ENCRYPTION_KEY` - 32-byte hex key for data encryption. Generate: `openssl rand -hex 32`
- `STORAGE_BACKEND` - Image storage: `local` (default) or `r2`
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with new routes and config"
```

---

### Task 10: End-to-end verification

- [ ] **Step 1: Full flow test**

Run `pnpm dev` and verify:

1. `/login` -> sign in -> redirects to `/connect`
2. `/connect` -> validate API key -> "Save & Sync" -> redirects to `/dashboard`
3. Dashboard: avatar dropdown shows Profile and Log out
4. Dashboard: Sync button + "Synced..." timestamp visible
5. Dropdown -> Profile -> navigates to `/profile`
6. Profile: change name -> Save -> name updates in session
7. Profile: upload avatar -> avatar updates in header dropdown
8. Profile: enter new API key -> Validate & Save -> shows success
9. Profile: change password -> log out -> log in with new password
10. Profile: Delete Account -> confirm dialog -> password -> account deleted -> redirects to login
11. Guest mode: `/connect` without login -> Disconnect button (no dropdown)
12. Old routes `/hevy/connect` and `/hevy/dashboard` return 404

- [ ] **Step 2: Check database after deletion**

```bash
sqlite3 dev.db "SELECT user_id FROM hevy_workouts LIMIT 5;"
```

After account deletion, `user_id` should be null for that user's workouts.

- [ ] **Step 3: Final commit if any cleanup needed**

```bash
git status
# Add any remaining files
```
