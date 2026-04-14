import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
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
	prCounts?: Map<string, number>;
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

export function RecentWorkouts({ workouts, prCounts }: Props) {
	const recent = recentWorkouts(workouts, 10);

	if (recent.length === 0) {
		return (
			<Card className="rise-in" style={{ animationDelay: "300ms" }}>
				<CardHeader>
					<CardTitle>Recent Workouts</CardTitle>
					<CardDescription>Your latest sessions</CardDescription>
				</CardHeader>
				<CardContent className="flex h-32 flex-col items-center justify-center gap-1 text-center text-sm">
					<p className="font-medium">Nothing in this window</p>
					<p className="text-xs text-muted-foreground">
						No sessions in the selected range. Try a wider date range.
					</p>
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
						<Link
							key={w.id}
							to="/workout/$id"
							params={{ id: w.id }}
							className="-mx-2 flex flex-col gap-2 rounded-md px-2 py-3 transition-colors hover:bg-accent/50 sm:flex-row sm:items-center sm:gap-4 lg:flex-col lg:items-stretch lg:gap-2"
						>
							<div className="flex min-w-0 flex-1 items-baseline justify-between gap-2 sm:block lg:flex">
								<p className="min-w-0 flex-1 truncate font-medium">
									{w.title}
								</p>
								<p className="shrink-0 text-xs text-muted-foreground">
									{formatDate(w.date)}
								</p>
							</div>
							<div className="flex flex-wrap items-center gap-1.5 sm:justify-end lg:justify-start">
								{(() => {
									const count = prCounts?.get(w.id) ?? 0;
									if (count === 0) return null;
									return (
										<Badge className="gap-1 border-amber-500/30 bg-amber-500/15 text-[10px] text-amber-700 dark:text-amber-400">
											<Trophy className="size-3" />
											{count} PR{count > 1 ? "s" : ""}
										</Badge>
									);
								})()}
								<Badge variant="secondary" className="text-[10px]">
									{w.durationMin}m
								</Badge>
								<Badge variant="secondary" className="text-[10px]">
									{w.exerciseCount} ex
								</Badge>
								<Badge variant="secondary" className="text-[10px]">
									{w.totalSets} sets
								</Badge>
								{w.totalVolume > 0 && (
									<Badge variant="outline" className="text-[10px]">
										{formatVolume(w.totalVolume)}
									</Badge>
								)}
							</div>
						</Link>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
