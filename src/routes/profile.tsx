import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
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

// ─── Helpers ────────────────────────────────────────────────────────────────

function initials(name: string | null | undefined): string {
	if (!name) return "?";
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0].toUpperCase())
		.join("");
}

// ─── Message helpers ─────────────────────────────────────────────────────────

function ErrorMsg({ message }: { message: string }) {
	return (
		<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
			<p className="text-sm text-destructive">{message}</p>
		</div>
	);
}

function SuccessMsg({ message }: { message: string }) {
	return (
		<div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
			<p className="text-sm text-emerald-700 dark:text-emerald-400">
				{message}
			</p>
		</div>
	);
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner() {
	return (
		<span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
	);
}

// ─── PersonalInfoCard ─────────────────────────────────────────────────────────

type User = {
	id: string;
	name: string | null;
	email: string;
	image: string | null;
};

function PersonalInfoCard({
	user,
	onUpdate,
}: {
	user: User;
	onUpdate: () => void;
}) {
	const fileRef = useRef<HTMLInputElement>(null);
	const [name, setName] = useState(user.name ?? "");
	const [avatarSrc, setAvatarSrc] = useState(user.image ?? "");
	const [saving, setSaving] = useState(false);
	const [uploadingAvatar, setUploadingAvatar] = useState(false);
	const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

	const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setUploadingAvatar(true);
		try {
			const reader = new FileReader();
			reader.onload = async () => {
				const base64 = (reader.result as string).split(",")[1];
				const result = await uploadProfileImage({
					data: { userId: user.id, fileName: file.name, base64 },
				});
				setAvatarSrc(result.url);
				await authClient.updateUser({ image: result.url });
				onUpdate();
			};
			reader.readAsDataURL(file);
		} catch {
			// silently fail avatar upload — not critical
		} finally {
			setUploadingAvatar(false);
		}
	};

	const handleSave = async () => {
		setSaving(true);
		setStatus("idle");
		try {
			await authClient.updateUser({ name });
			setStatus("saved");
			onUpdate();
		} catch {
			setStatus("error");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Card className="rise-in">
			<CardHeader>
				<CardTitle className="font-display text-lg">Personal info</CardTitle>
				<CardDescription>Your name and profile photo</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-5">
				{/* Avatar */}
				<div className="flex items-center gap-4">
					<button
						type="button"
						className="group relative h-16 w-16 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						onClick={() => fileRef.current?.click()}
						aria-label="Change profile photo"
						disabled={uploadingAvatar}
					>
						<Avatar className="h-16 w-16">
							<AvatarImage src={avatarSrc} alt={name} />
							<AvatarFallback className="text-xl font-medium">
								{initials(name)}
							</AvatarFallback>
						</Avatar>
						<div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
							{uploadingAvatar ? (
								<Spinner />
							) : (
								<span className="text-xs font-medium text-white">Edit</span>
							)}
						</div>
					</button>
					<div>
						<p className="text-sm font-medium">{name || "No name set"}</p>
						<p className="text-xs text-muted-foreground">{user.email}</p>
					</div>
				</div>

				<input
					ref={fileRef}
					type="file"
					accept="image/*"
					className="hidden"
					onChange={handleImageChange}
				/>

				{/* Name */}
				<div className="grid gap-2">
					<Label htmlFor="profile-name">Name</Label>
					<Input
						id="profile-name"
						value={name}
						onChange={(e) => {
							setName(e.target.value);
							setStatus("idle");
						}}
						disabled={saving}
					/>
				</div>

				{/* Email (read-only) */}
				<div className="grid gap-2">
					<Label htmlFor="profile-email">Email</Label>
					<Input id="profile-email" value={user.email} disabled />
					<p className="text-xs text-muted-foreground">
						Email cannot be changed at this time.
					</p>
				</div>

				{status === "saved" && <SuccessMsg message="Saved." />}
				{status === "error" && (
					<ErrorMsg message="Failed to save. Try again." />
				)}

				<Button onClick={handleSave} disabled={saving} className="w-fit">
					{saving ? (
						<span className="flex items-center gap-2">
							<Spinner /> Saving...
						</span>
					) : (
						"Save changes"
					)}
				</Button>
			</CardContent>
		</Card>
	);
}

// ─── ApiKeyCard ───────────────────────────────────────────────────────────────

function ApiKeyCard({ userId }: { userId: string }) {
	const [key, setKey] = useState("");
	const [loading, setLoading] = useState(false);
	const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
	const [message, setMessage] = useState("");

	const handleValidateAndSave = async () => {
		if (!key.trim()) return;
		setLoading(true);
		setStatus("idle");
		setMessage("");

		try {
			const count = await fetchWorkoutCount({ data: { apiKey: key.trim() } });
			await saveApiKey({ data: { userId, apiKey: key.trim() } });
			setStatus("success");
			setMessage(`Key saved. Found ${count} workouts.`);
			setKey("");
		} catch {
			setStatus("error");
			setMessage(
				"Invalid API key or Hevy API is unavailable. Make sure you have Hevy Pro.",
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="rise-in">
			<CardHeader>
				<CardTitle className="font-display text-lg">Hevy API key</CardTitle>
				<CardDescription>
					Update the API key used to sync your workout data.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4">
				<div className="grid gap-2">
					<Label htmlFor="api-key-input">New API key</Label>
					<Input
						id="api-key-input"
						type="password"
						placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
						value={key}
						onChange={(e) => {
							setKey(e.target.value);
							setStatus("idle");
							setMessage("");
						}}
						disabled={loading}
					/>
					<p className="text-xs text-muted-foreground">
						Get your key at{" "}
						<a
							href="https://hevy.com/settings?developer"
							target="_blank"
							rel="noreferrer"
							className="underline hover:text-foreground"
						>
							hevy.com/settings
						</a>{" "}
						(requires Hevy Pro)
					</p>
				</div>

				{status === "success" && <SuccessMsg message={message} />}
				{status === "error" && <ErrorMsg message={message} />}

				<Button
					onClick={handleValidateAndSave}
					disabled={loading || !key.trim()}
					className="w-fit"
				>
					{loading ? (
						<span className="flex items-center gap-2">
							<Spinner /> Validating...
						</span>
					) : (
						"Validate & Save"
					)}
				</Button>
			</CardContent>
		</Card>
	);
}

// ─── ChangePasswordCard ───────────────────────────────────────────────────────

function ChangePasswordCard() {
	const [current, setCurrent] = useState("");
	const [next, setNext] = useState("");
	const [confirm, setConfirm] = useState("");
	const [loading, setLoading] = useState(false);
	const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
	const [message, setMessage] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setStatus("idle");
		setMessage("");

		if (next !== confirm) {
			setStatus("error");
			setMessage("New passwords don't match.");
			return;
		}

		setLoading(true);
		try {
			const result = await authClient.changePassword({
				currentPassword: current,
				newPassword: next,
				revokeOtherSessions: true,
			});
			if (result.error) {
				setStatus("error");
				setMessage(result.error.message ?? "Failed to change password.");
			} else {
				setStatus("success");
				setMessage("Password changed. Other sessions have been signed out.");
				setCurrent("");
				setNext("");
				setConfirm("");
			}
		} catch {
			setStatus("error");
			setMessage("Something went wrong. Try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card className="rise-in">
			<CardHeader>
				<CardTitle className="font-display text-lg">Change password</CardTitle>
				<CardDescription>
					You'll be signed out of other sessions on save.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="current-password">Current password</Label>
						<Input
							id="current-password"
							type="password"
							value={current}
							onChange={(e) => {
								setCurrent(e.target.value);
								setStatus("idle");
							}}
							required
							disabled={loading}
						/>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="new-password">New password</Label>
						<Input
							id="new-password"
							type="password"
							value={next}
							onChange={(e) => {
								setNext(e.target.value);
								setStatus("idle");
							}}
							required
							minLength={8}
							disabled={loading}
						/>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="confirm-password">Confirm new password</Label>
						<Input
							id="confirm-password"
							type="password"
							value={confirm}
							onChange={(e) => {
								setConfirm(e.target.value);
								setStatus("idle");
							}}
							required
							minLength={8}
							disabled={loading}
						/>
					</div>

					{status === "success" && <SuccessMsg message={message} />}
					{status === "error" && <ErrorMsg message={message} />}

					<Button type="submit" disabled={loading} className="w-fit">
						{loading ? (
							<span className="flex items-center gap-2">
								<Spinner /> Updating...
							</span>
						) : (
							"Update password"
						)}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

// ─── DangerZoneCard ───────────────────────────────────────────────────────────

function DangerZoneCard() {
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleDelete = async () => {
		setError("");
		setLoading(true);
		try {
			const result = await authClient.deleteUser({ password });
			if (result.error) {
				setError(result.error.message ?? "Failed to delete account.");
				setLoading(false);
				return;
			}
			navigate({ to: "/login" });
		} catch {
			setError("Something went wrong. Try again.");
			setLoading(false);
		}
	};

	return (
		<Card className="rise-in border-destructive/30">
			<CardHeader>
				<CardTitle className="font-display text-lg text-destructive">
					Danger zone
				</CardTitle>
				<CardDescription>
					Deleting your account removes your login and API key. Your workout
					data stays in the database anonymously and won't be attributed to any
					account.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button variant="destructive">Delete account</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete your account?</AlertDialogTitle>
							<AlertDialogDescription>
								This removes your account permanently. Your workout data will be
								retained but unlinked from your email. Enter your password to
								confirm.
							</AlertDialogDescription>
						</AlertDialogHeader>

						<div className="grid gap-2">
							<Label htmlFor="delete-password">Password</Label>
							<Input
								id="delete-password"
								type="password"
								value={password}
								onChange={(e) => {
									setPassword(e.target.value);
									setError("");
								}}
								disabled={loading}
								autoComplete="current-password"
							/>
							{error && <ErrorMsg message={error} />}
						</div>

						<AlertDialogFooter>
							<AlertDialogCancel onClick={() => setPassword("")}>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								onClick={handleDelete}
								disabled={loading || !password}
							>
								{loading ? (
									<span className="flex items-center gap-2">
										<Spinner /> Deleting...
									</span>
								) : (
									"Delete account"
								)}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</CardContent>
		</Card>
	);
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

function ProfilePage() {
	const navigate = useNavigate();
	const { data: session, refetch } = authClient.useSession();

	if (!session?.user) {
		navigate({ to: "/login" });
		return null;
	}

	const user = session.user as User;

	return (
		<main className="min-h-screen px-4 py-12">
			<div className="mx-auto max-w-lg">
				<header className="mb-8">
					<h1 className="font-display text-3xl font-semibold tracking-tight">
						Profile
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Manage your account settings
					</p>
				</header>

				<div className="flex flex-col gap-6">
					<PersonalInfoCard user={user} onUpdate={refetch} />
					<ApiKeyCard userId={user.id} />
					<ChangePasswordCard />
					<DangerZoneCard />
				</div>
			</div>
		</main>
	);
}
