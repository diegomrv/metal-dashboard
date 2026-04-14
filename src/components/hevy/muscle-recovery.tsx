import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { daysSinceMuscleTrained } from "#/lib/hevy/metrics";
import type { ExerciseTemplate, Workout } from "#/lib/hevy/types";

interface Props {
	workouts: Workout[];
	templates: ExerciseTemplate[];
}

const HIDDEN = new Set(["full_body", "cardio", "other"]);

function daysLabel(days: number): string {
	if (!Number.isFinite(days)) return "never";
	if (days === 0) return "today";
	if (days === 1) return "1 day ago";
	return `${days} days ago`;
}

export function MuscleRecovery({ workouts, templates }: Props) {
	const entries = daysSinceMuscleTrained(workouts, templates).filter(
		(e) => !HIDDEN.has(e.muscle),
	);

	return (
		<Card className="rise-in" style={{ animationDelay: "170ms" }}>
			<CardHeader>
				<CardTitle>Recovery</CardTitle>
				<CardDescription>Days since each muscle was trained</CardDescription>
			</CardHeader>
			<CardContent>
				<ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					{entries.map((e) => {
						const stale = Number.isFinite(e.days) && e.days > 7;
						const never = !Number.isFinite(e.days);
						return (
							<li
								key={e.muscle}
								className="flex items-center justify-between gap-2"
							>
								<div className="flex items-center gap-2 min-w-0">
									<span
										className={`h-1.5 w-1.5 shrink-0 rounded-full ${
											never
												? "bg-muted-foreground/40"
												: stale
													? "bg-chart-1"
													: "bg-chart-3"
										}`}
									/>
									<span className="truncate text-muted-foreground">
										{e.label}
									</span>
								</div>
								<span
									className={`tabular-nums text-xs ${
										never || stale ? "text-muted-foreground" : "font-medium"
									}`}
								>
									{daysLabel(e.days)}
								</span>
							</li>
						);
					})}
				</ul>
			</CardContent>
		</Card>
	);
}
