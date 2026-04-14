import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { getApiKey, saveApiKey, syncHevyData } from "#/lib/hevy/sync";
import { useApiKey } from "#/lib/hevy/use-hevy-data";

export const Route = createFileRoute("/connect")({
	component: HevyConnect,
});

function HevyConnect() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();
	const { setApiKey } = useApiKey();
	const [key, setKey] = useState("");
	const [loading, setLoading] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [error, setError] = useState("");
	const [validated, setValidated] = useState<number | null>(null);

	useEffect(() => {
		if (isPending) return;
		if (!session?.user?.id) return;
		getApiKey({ data: { userId: session.user.id } }).then((storedKey) => {
			if (storedKey) {
				setApiKey(storedKey);
				navigate({ to: "/dashboard" });
			}
		});
	}, [session?.user?.id, isPending, navigate, setApiKey]);

	const handleValidate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!key.trim()) return;

		setError("");
		setLoading(true);

		try {
			const count = await fetchWorkoutCount({ data: { apiKey: key.trim() } });
			setValidated(count);
		} catch {
			setError(
				"That key didn't work. Double-check it at hevy.com/settings and confirm Hevy Pro is active.",
			);
		} finally {
			setLoading(false);
		}
	};

	const handleLoadDashboard = () => {
		setApiKey(key.trim());
		navigate({ to: "/dashboard" });
	};

	const handleSaveAndSync = async () => {
		if (!session?.user?.id) return;

		setSyncing(true);
		setError("");

		try {
			await saveApiKey({
				data: { userId: session.user.id, apiKey: key.trim() },
			});
			await syncHevyData({
				data: { userId: session.user.id, apiKey: key.trim() },
			});
			setApiKey(key.trim());
			navigate({ to: "/dashboard" });
		} catch {
			setError(
				"Sync failed. Hevy's API may be down, or your key was revoked. Try again in a minute.",
			);
		} finally {
			setSyncing(false);
		}
	};

	return (
		<main className="flex min-h-screen items-center justify-center px-4">
			<Card className="rise-in w-full max-w-lg">
				<CardHeader>
					<CardTitle className="font-display text-2xl">
						Connect to Hevy
					</CardTitle>
					<CardDescription>
						Enter your Hevy Pro API key to load your workout data. Guest mode
						stores data only in this browser tab.
						{!session?.user && (
							<>
								{" "}
								<Link to="/login" className="underline">
									Sign in
								</Link>{" "}
								to save your key and sync data across sessions.
							</>
						)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleValidate} className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="api-key">API Key</Label>
							<Input
								id="api-key"
								type="password"
								placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
								value={key}
								onChange={(e) => {
									setKey(e.target.value);
									setValidated(null);
									setError("");
								}}
								disabled={loading || syncing}
							/>
							<p className="text-xs text-muted-foreground">
								Get your API key at{" "}
								<a
									href="https://hevy.com/settings?developer"
									target="_blank"
									rel="noreferrer"
									className="underline"
								>
									hevy.com/settings
								</a>{" "}
								(requires Hevy Pro)
							</p>
						</div>

						{error && (
							<div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
								<p className="text-sm text-destructive">{error}</p>
							</div>
						)}

						{validated !== null && (
							<div className="rounded-md border border-[var(--lagoon)]/30 bg-[var(--lagoon)]/10 p-3">
								<p className="text-sm text-[var(--sea-ink)]">
									Key validated. Found <strong>{validated}</strong> workouts.
								</p>
							</div>
						)}

						{validated === null ? (
							<Button type="submit" disabled={loading || !key.trim()}>
								{loading ? (
									<span className="flex items-center gap-2">
										<span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
										Validating...
									</span>
								) : (
									"Validate Key"
								)}
							</Button>
						) : (
							<div className="grid gap-3">
								{session?.user ? (
									<>
										<Button
											type="button"
											onClick={handleSaveAndSync}
											disabled={syncing}
										>
											{syncing ? (
												<span className="flex items-center gap-2">
													<span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
													Syncing to your account...
												</span>
											) : (
												"Save & Sync to Account"
											)}
										</Button>
										<p className="text-xs text-muted-foreground">
											Saves your API key and workout data to the database so it
											persists across sessions.
										</p>
									</>
								) : (
									<Button type="button" onClick={handleLoadDashboard}>
										Load Dashboard (Guest)
									</Button>
								)}
							</div>
						)}
					</form>

					<p className="mt-4 text-center text-sm text-muted-foreground">
						<Link to="/login" className="text-primary underline">
							Back to login
						</Link>
					</p>
				</CardContent>
			</Card>
		</main>
	);
}
