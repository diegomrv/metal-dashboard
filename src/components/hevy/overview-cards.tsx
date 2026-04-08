import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
	avgDurationMinutes,
	currentStreak,
	totalDurationHours,
	totalWorkouts,
	workoutsInPeriod,
} from "#/lib/hevy/metrics";
import type { Workout } from "#/lib/hevy/types";

interface Props {
	workouts: Workout[];
}

export function OverviewCards({ workouts }: Props) {
	const now = new Date();
	const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

	const stats = [
		{
			title: "Total Workouts",
			value: totalWorkouts(workouts).toLocaleString(),
		},
		{
			title: "Total Hours",
			value: totalDurationHours(workouts).toFixed(1),
		},
		{
			title: "Avg Duration",
			value: `${Math.round(avgDurationMinutes(workouts))} min`,
		},
		{
			title: "Week Streak",
			value: `${currentStreak(workouts)} wk`,
		},
		{
			title: "This Week",
			value: workoutsInPeriod(workouts, weekAgo).toString(),
		},
		{
			title: "This Month",
			value: workoutsInPeriod(workouts, monthAgo).toString(),
		},
	];

	return (
		<div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
			{stats.map((stat, i) => (
				<Card
					key={stat.title}
					className="rise-in"
					style={{ animationDelay: `${i * 60}ms` }}
				>
					<CardHeader className="pb-2">
						<CardTitle className="text-xs font-medium text-muted-foreground">
							{stat.title}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-bold tabular-nums">{stat.value}</p>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
