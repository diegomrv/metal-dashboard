import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { plateauedExercises } from "#/lib/hevy/metrics";
import type { ExerciseTemplate, Workout } from "#/lib/hevy/types";

interface Props {
	workouts: Workout[];
	templates: ExerciseTemplate[];
}

export function PlateauList({ workouts, templates }: Props) {
	const plateaus = plateauedExercises(workouts, templates);

	return (
		<Card className="rise-in" style={{ animationDelay: "200ms" }}>
			<CardHeader>
				<CardTitle>Plateaus</CardTitle>
				<CardDescription>
					Lifts that haven't posted a new e1RM in a while
				</CardDescription>
			</CardHeader>
			<CardContent>
				{plateaus.length === 0 ? (
					<div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
						No plateaued lifts — keep pushing.
					</div>
				) : (
					<ul className="divide-y divide-border text-sm">
						{plateaus.slice(0, 8).map((p) => (
							<li
								key={p.templateId}
								className="flex items-center justify-between gap-3 py-2"
							>
								<span className="truncate font-medium">{p.title}</span>
								<div className="flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
									<span>{p.currentBestE1rm} kg</span>
									<span>{p.weeksStale}w stale</span>
								</div>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}
