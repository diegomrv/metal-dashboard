import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExerciseProgression } from "#/components/hevy/exercise-progression";
import { MuscleDistribution } from "#/components/hevy/muscle-distribution";
import { OverviewCards } from "#/components/hevy/overview-cards";
import { RecentWorkouts } from "#/components/hevy/recent-workouts";
import { VolumeChart } from "#/components/hevy/volume-chart";
import { WorkoutFrequency } from "#/components/hevy/workout-frequency";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { UserMenu } from "#/components/user-menu";
import { authClient } from "#/lib/auth-client";
import { getStoredData, syncHevyData } from "#/lib/hevy/sync";
import { useApiKey, useHevyData } from "#/lib/hevy/use-hevy-data";

export const Route = createFileRoute("/dashboard")({
	component: HevyDashboard,
});

function HevyDashboard() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();
	const { apiKey, clearApiKey } = useApiKey();
	const { workouts, exerciseTemplates, isLoading, isError, error } =
		useHevyData(apiKey);
	const [syncing, setSyncing] = useState(false);
	const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

	useEffect(() => {
		if (!session?.user?.id) return;
		getStoredData({ data: { userId: session.user.id } }).then((stored) => {
			setLastSyncAt(stored.lastSyncAt);
		});
	}, [session?.user?.id]);

	if (!apiKey) {
		navigate({ to: "/connect" });
		return null;
	}

	const handleDisconnect = () => {
		clearApiKey();
		navigate({ to: "/connect" });
	};

	const handleSync = async () => {
		if (!session?.user?.id || !apiKey) return;
		setSyncing(true);
		try {
			await syncHevyData({
				data: { userId: session.user.id, apiKey },
			});
			setLastSyncAt(new Date().toISOString());
			await queryClient.invalidateQueries({ queryKey: ["hevy"] });
		} finally {
			setSyncing(false);
		}
	};

	if (isError) {
		return (
			<main className="page-wrap py-12">
				<div className="rise-in mx-auto max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
					<h2 className="mb-2 text-lg font-semibold text-destructive">
						Failed to load data
					</h2>
					<p className="mb-4 text-sm text-muted-foreground">
						{error?.message ||
							"Something went wrong while fetching your Hevy data."}
					</p>
					<Button variant="outline" onClick={handleDisconnect}>
						Try a different key
					</Button>
				</div>
			</main>
		);
	}

	return (
		<main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-12">
			<div className="rise-in mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="font-display text-3xl font-bold">Your Training</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{workouts.data
							? `${workouts.data.length} workouts loaded`
							: "Loading your data..."}
					</p>
				</div>
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
			</div>

			{isLoading ? (
				<DashboardSkeleton />
			) : (
				<div className="grid gap-8">
					<OverviewCards workouts={workouts.data ?? []} />
					<div className="grid gap-8 lg:grid-cols-2">
						<WorkoutFrequency workouts={workouts.data ?? []} />
						<MuscleDistribution
							workouts={workouts.data ?? []}
							templates={exerciseTemplates.data ?? []}
						/>
					</div>
					<VolumeChart workouts={workouts.data ?? []} />
					<ExerciseProgression
						workouts={workouts.data ?? []}
						templates={exerciseTemplates.data ?? []}
					/>
					<RecentWorkouts workouts={workouts.data ?? []} />
				</div>
			)}
		</main>
	);
}

function DashboardSkeleton() {
	return (
		<div className="grid gap-8">
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{["s1", "s2", "s3", "s4"].map((id) => (
					<Skeleton key={id} className="h-28 rounded-xl" />
				))}
			</div>
			<div className="grid gap-8 lg:grid-cols-2">
				<Skeleton className="h-80 rounded-xl" />
				<Skeleton className="h-80 rounded-xl" />
			</div>
			<Skeleton className="h-80 rounded-xl" />
			<Skeleton className="h-96 rounded-xl" />
			<Skeleton className="h-64 rounded-xl" />
		</div>
	);
}
