import { Badge } from "#/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { recentWorkouts } from "#/lib/hevy/metrics";
import type { Workout } from "#/lib/hevy/types";

interface Props {
	workouts: Workout[];
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}

function formatVolume(kg: number): string {
	if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
	return `${kg.toLocaleString()} kg`;
}

export function RecentWorkouts({ workouts }: Props) {
	const recent = recentWorkouts(workouts, 10);

	if (recent.length === 0) {
		return (
			<Card className="rise-in" style={{ animationDelay: "300ms" }}>
				<CardHeader>
					<CardTitle>Recent Workouts</CardTitle>
					<CardDescription>Your latest sessions</CardDescription>
				</CardHeader>
				<CardContent className="flex h-32 items-center justify-center text-sm text-muted-foreground">
					No workouts yet
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="rise-in" style={{ animationDelay: "300ms" }}>
			<CardHeader>
				<CardTitle>Recent Workouts</CardTitle>
				<CardDescription>Your last {recent.length} sessions</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="divide-y divide-border">
					{recent.map((w) => (
						<div
							key={w.id}
							className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4"
						>
							<div className="flex-1 min-w-0">
								<p className="font-medium truncate">{w.title}</p>
								<p className="text-xs text-muted-foreground">
									{formatDate(w.date)}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="secondary">{w.durationMin} min</Badge>
								<Badge variant="secondary">{w.exerciseCount} exercises</Badge>
								<Badge variant="secondary">{w.totalSets} sets</Badge>
								{w.totalVolume > 0 && (
									<Badge variant="outline">{formatVolume(w.totalVolume)}</Badge>
								)}
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
