import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CommandItem } from "#/components/command-palette";
import { CommandPalette, KeyboardHelp } from "#/components/command-palette";
import { ActivityHeatmap } from "#/components/hevy/activity-heatmap";
import {
	DashboardHeader,
	type DateRange,
	filterWorkoutsByRange,
} from "#/components/hevy/dashboard-header";
import { ExerciseProgression } from "#/components/hevy/exercise-progression";
import { MuscleDistribution } from "#/components/hevy/muscle-distribution";
import { PersonalRecordsFeed } from "#/components/hevy/personal-records-feed";
import { RecentWorkouts } from "#/components/hevy/recent-workouts";
import { VolumeChart } from "#/components/hevy/volume-chart";
import { WorkoutFrequency } from "#/components/hevy/workout-frequency";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { UserMenu } from "#/components/user-menu";
import { authClient } from "#/lib/auth-client";
import { computePRsFromWorkouts } from "#/lib/hevy/pr";
import { getApiKey, syncHevyData } from "#/lib/hevy/sync";
import {
	useApiKey,
	useHevyData,
	useStoredHevyData,
} from "#/lib/hevy/use-hevy-data";

export const Route = createFileRoute("/dashboard")({
	component: HevyDashboard,
});

function HevyDashboard() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const userId = session?.user?.id ?? null;

	const { apiKey, clearApiKey } = useApiKey();
	const stored = useStoredHevyData(userId);
	const guest = useHevyData(userId ? null : apiKey);

	const isAuthMode = !!userId;
	const allWorkouts = isAuthMode
		? stored.workouts
		: (guest.workouts.data ?? []);
	const exerciseTemplates = isAuthMode
		? stored.exerciseTemplates
		: (guest.exerciseTemplates.data ?? []);
	const isLoading = isAuthMode ? stored.isLoading : guest.isLoading;
	const isError = isAuthMode ? stored.isError : guest.isError;
	const error = isAuthMode ? stored.error : guest.error;
	const lastSyncAt = isAuthMode ? stored.lastSyncAt : null;

	const [dateRange, setDateRange] = useState<DateRange>("90d");
	const [cmdOpen, setCmdOpen] = useState(false);
	const [helpOpen, setHelpOpen] = useState(false);
	const [disconnectOpen, setDisconnectOpen] = useState(false);
	const [syncing, setSyncing] = useState(false);

	const workouts = useMemo(
		() => filterWorkoutsByRange(allWorkouts, dateRange),
		[allWorkouts, dateRange],
	);

	const prCounts = useMemo(() => {
		if (workouts.length === 0 || exerciseTemplates.length === 0) {
			return new Map<string, number>();
		}
		const templateMap = new Map(exerciseTemplates.map((t) => [t.id, t]));
		const sorted = [...workouts].sort(
			(a, b) =>
				new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
		);
		const prs = computePRsFromWorkouts(sorted, templateMap);
		const counts = new Map<string, number>();
		for (const pr of prs) {
			counts.set(pr.workoutId, (counts.get(pr.workoutId) ?? 0) + 1);
		}
		return counts;
	}, [workouts, exerciseTemplates]);

	useEffect(() => {
		if (sessionPending) return;
		if (isAuthMode) {
			if (!stored.isLoading && stored.workouts.length === 0) {
				navigate({ to: "/connect" });
			}
		} else if (!apiKey) {
			navigate({ to: "/connect" });
		}
	}, [
		sessionPending,
		isAuthMode,
		stored.isLoading,
		stored.workouts.length,
		apiKey,
		navigate,
	]);

	const confirmDisconnect = useCallback(() => {
		clearApiKey();
		navigate({ to: "/connect" });
	}, [clearApiKey, navigate]);

	const handleSync = useCallback(async () => {
		if (!userId) return;
		setSyncing(true);
		try {
			const key = await getApiKey({ data: { userId } });
			if (!key) return;
			await syncHevyData({ data: { userId, apiKey: key } });
			await Promise.all([
				queryClient.refetchQueries({ queryKey: ["hevy", "stored", userId] }),
				queryClient.refetchQueries({ queryKey: ["hevy", "prs", userId] }),
			]);
		} finally {
			setSyncing(false);
		}
	}, [queryClient, userId]);

	const handleSignOut = useCallback(async () => {
		await authClient.signOut();
		navigate({ to: "/login" });
	}, [navigate]);

	const commandItems: CommandItem[] = useMemo(() => {
		const items: CommandItem[] = [
			{
				id: "nav-dashboard",
				label: "Dashboard",
				group: "Navigate",
				keywords: ["home", "training"],
				onSelect: () => navigate({ to: "/dashboard" }),
			},
			{
				id: "nav-profile",
				label: "Profile",
				group: "Navigate",
				keywords: ["account", "settings"],
				onSelect: () => navigate({ to: "/profile" }),
			},
			{
				id: "nav-connect",
				label: "Connect Hevy API",
				group: "Navigate",
				keywords: ["api", "key"],
				onSelect: () => navigate({ to: "/connect" }),
			},
			...(["7d", "30d", "90d", "1y", "all"] as DateRange[]).map((r) => ({
				id: `range-${r}`,
				label: `Range: ${r === "all" ? "All time" : r}`,
				group: "Date range",
				keywords: ["filter", "period"],
				onSelect: () => setDateRange(r),
			})),
			{
				id: "help",
				label: "Show keyboard shortcuts",
				group: "Help",
				shortcut: ["?"],
				onSelect: () => setHelpOpen(true),
			},
		];
		if (isAuthMode) {
			items.push({
				id: "sync",
				label: "Sync Hevy data",
				group: "Actions",
				hint: "Pull the latest workouts from Hevy",
				onSelect: handleSync,
			});
			items.push({
				id: "signout",
				label: "Sign out",
				group: "Actions",
				onSelect: handleSignOut,
			});
		} else {
			items.push({
				id: "disconnect",
				label: "Disconnect API key",
				group: "Actions",
				onSelect: () => setDisconnectOpen(true),
			});
		}
		return items;
	}, [isAuthMode, handleSync, handleSignOut, navigate]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setCmdOpen((o) => !o);
				return;
			}
			if (
				e.key === "?" &&
				!cmdOpen &&
				!(e.target instanceof HTMLInputElement) &&
				!(e.target instanceof HTMLTextAreaElement)
			) {
				e.preventDefault();
				setHelpOpen((o) => !o);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [cmdOpen]);

	if (isError) {
		const message = error?.message ?? "";
		const isAuthError = /401|unauthorized|api key/i.test(message);
		return (
			<main className="page-wrap py-12">
				<div className="rise-in mx-auto max-w-md border border-destructive/50 bg-destructive/10 p-6">
					<h2 className="font-display text-lg font-semibold text-destructive">
						{isAuthError
							? "Your Hevy API key stopped working"
							: "We couldn't reach Hevy"}
					</h2>
					<p className="mt-2 text-sm text-muted-foreground">
						{isAuthError
							? "It may have been rotated or revoked. Enter a fresh key to continue."
							: "Hevy's API may be temporarily unavailable. Try again in a minute, or enter a different key."}
					</p>
					{message && (
						<p className="mt-3 bg-background/60 p-2 font-mono text-xs text-muted-foreground">
							{message}
						</p>
					)}
					<div className="mt-4 flex gap-2">
						<Button variant="outline" onClick={() => window.location.reload()}>
							Retry
						</Button>
						<Button onClick={() => setDisconnectOpen(true)}>
							Enter a new key
						</Button>
					</div>
				</div>
				<DisconnectDialog
					open={disconnectOpen}
					onOpenChange={setDisconnectOpen}
					isAuthMode={isAuthMode}
					onConfirm={confirmDisconnect}
				/>
			</main>
		);
	}

	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
			<DashboardHeader
				allWorkouts={allWorkouts}
				loadedCount={allWorkouts.length}
				dateRange={dateRange}
				onDateRangeChange={setDateRange}
				onSync={isAuthMode ? handleSync : undefined}
				syncing={syncing}
				lastSyncAt={lastSyncAt}
				rightSlot={
					session?.user ? (
						<UserMenu />
					) : (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setDisconnectOpen(true)}
						>
							Disconnect
						</Button>
					)
				}
			/>

			{isLoading ? (
				<DashboardSkeleton />
			) : (
				<div className="flex flex-col gap-6">
					<ActivityHeatmap workouts={allWorkouts} bare />

					<div className="grid gap-6 lg:grid-cols-3">
						<div className="flex flex-col gap-6 lg:col-span-2">
							<VolumeChart workouts={workouts} />
							<ExerciseProgression
								workouts={workouts}
								templates={exerciseTemplates}
							/>
							<div className="grid gap-6 md:grid-cols-2">
								<WorkoutFrequency workouts={workouts} />
								<MuscleDistribution
									workouts={workouts}
									templates={exerciseTemplates}
								/>
							</div>
						</div>

						<aside className="flex flex-col gap-6 lg:col-span-1">
							{isAuthMode && userId && <PersonalRecordsFeed userId={userId} />}
							<RecentWorkouts workouts={workouts} prCounts={prCounts} />
						</aside>
					</div>
				</div>
			)}

			<CommandPalette
				open={cmdOpen}
				onOpenChange={setCmdOpen}
				items={commandItems}
			/>
			<KeyboardHelp
				open={helpOpen}
				onOpenChange={setHelpOpen}
				shortcuts={[
					{ keys: ["⌘", "K"], description: "Open command palette" },
					{ keys: ["?"], description: "Show this help" },
					{ keys: ["Esc"], description: "Close dialogs" },
				]}
			/>
			<DisconnectDialog
				open={disconnectOpen}
				onOpenChange={setDisconnectOpen}
				isAuthMode={isAuthMode}
				onConfirm={confirmDisconnect}
			/>
		</main>
	);
}

function DisconnectDialog({
	open,
	onOpenChange,
	isAuthMode,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	isAuthMode: boolean;
	onConfirm: () => void;
}) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Disconnect your Hevy key?</AlertDialogTitle>
					<AlertDialogDescription>
						{isAuthMode
							? "Your saved API key will be cleared from this session. Your synced workout data stays in your account."
							: "Guest data is only held in this browser tab, so it will be gone. Your key isn't stored anywhere."}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm}>Disconnect</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function DashboardSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			<Skeleton className="h-28 rounded-none" />
			<div className="grid gap-6 lg:grid-cols-3">
				<div className="flex flex-col gap-6 lg:col-span-2">
					<Skeleton className="h-80 rounded-none" />
					<Skeleton className="h-96 rounded-none" />
					<div className="grid gap-6 md:grid-cols-2">
						<Skeleton className="h-72 rounded-none" />
						<Skeleton className="h-72 rounded-none" />
					</div>
				</div>
				<div className="flex flex-col gap-6">
					<Skeleton className="h-80 rounded-none" />
					<Skeleton className="h-80 rounded-none" />
				</div>
			</div>
		</div>
	);
}
