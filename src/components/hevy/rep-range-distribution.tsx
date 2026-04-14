import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { repRangeDistribution } from "#/lib/hevy/metrics";
import type { Workout } from "#/lib/hevy/types";

interface Props {
	workouts: Workout[];
}

const BUCKETS = [
	{ key: "strength", label: "Strength", range: "1-5", color: "var(--chart-1)" },
	{
		key: "hypertrophy",
		label: "Hypertrophy",
		range: "6-12",
		color: "var(--chart-2)",
	},
	{
		key: "endurance",
		label: "Endurance",
		range: "13+",
		color: "var(--chart-3)",
	},
] as const;

export function RepRangeDistribution({ workouts }: Props) {
	const dist = repRangeDistribution(workouts);

	return (
		<Card className="rise-in" style={{ animationDelay: "160ms" }}>
			<CardHeader>
				<CardTitle>Rep Range Mix</CardTitle>
				<CardDescription>
					Working sets by rep range ({dist.total.toLocaleString()} total)
				</CardDescription>
			</CardHeader>
			<CardContent>
				{dist.total === 0 ? (
					<div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
						No working sets in range
					</div>
				) : (
					<div className="flex flex-col gap-4">
						<div className="flex h-3 w-full overflow-hidden rounded-sm bg-muted">
							{BUCKETS.map((b) => {
								const count = dist[b.key];
								const pct = (count / dist.total) * 100;
								if (pct === 0) return null;
								return (
									<div
										key={b.key}
										style={{ width: `${pct}%`, backgroundColor: b.color }}
									/>
								);
							})}
						</div>
						<div className="grid grid-cols-3 gap-3 text-sm">
							{BUCKETS.map((b) => {
								const count = dist[b.key];
								const pct = dist.total > 0 ? (count / dist.total) * 100 : 0;
								return (
									<div key={b.key} className="flex flex-col gap-1">
										<div className="flex items-center gap-1.5">
											<span
												className="h-2.5 w-2.5 rounded-sm"
												style={{ backgroundColor: b.color }}
											/>
											<span className="text-muted-foreground">{b.label}</span>
										</div>
										<div className="tabular-nums font-medium">
											{count.toLocaleString()}{" "}
											<span className="text-xs text-muted-foreground">
												({pct.toFixed(0)}% · {b.range})
											</span>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
