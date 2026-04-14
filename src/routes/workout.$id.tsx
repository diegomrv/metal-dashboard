import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { WorkoutDetail } from "#/components/hevy/workout-detail";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { authClient } from "#/lib/auth-client";
import { getWorkoutById } from "#/lib/hevy/sync";

export const Route = createFileRoute("/workout/$id")({
	component: WorkoutPage,
});

function WorkoutPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { data: session, isPending: sessionPending } = authClient.useSession();
	const userId = session?.user?.id ?? null;

	useEffect(() => {
		if (!sessionPending && !userId) {
			navigate({ to: "/login" });
		}
	}, [sessionPending, userId, navigate]);

	const query = useQuery({
		queryKey: ["hevy", "workout", userId, id],
		queryFn: () =>
			getWorkoutById({ data: { userId: userId as string, hevyId: id } }),
		enabled: !!userId,
	});

	return (
		<main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
			<div className="mb-6">
				<Link
					to="/dashboard"
					className="text-sm text-muted-foreground hover:text-foreground"
				>
					&larr; Back to dashboard
				</Link>
			</div>

			{query.isLoading || sessionPending ? (
				<div className="flex flex-col gap-6">
					<Skeleton className="h-32 rounded-xl" />
					<Skeleton className="h-64 rounded-xl" />
					<Skeleton className="h-64 rounded-xl" />
				</div>
			) : query.data ? (
				<WorkoutDetail
					workout={query.data.workout}
					templates={query.data.templates}
					prs={query.data.prs}
				/>
			) : (
				<div className="rise-in mx-auto max-w-md rounded-lg border border-border p-6 text-center">
					<h2 className="mb-2 font-display text-lg font-semibold">
						Workout not found
					</h2>
					<p className="mb-4 text-sm text-muted-foreground">
						This workout doesn't exist or isn't in your synced data.
					</p>
					<Button asChild variant="outline">
						<Link to="/dashboard">Back to dashboard</Link>
					</Button>
				</div>
			)}
		</main>
	);
}
