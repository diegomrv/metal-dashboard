import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { estimated1RM } from "#/lib/hevy/metrics";
import type {
	ExerciseTemplate,
	WorkoutExercise,
	WorkoutSet,
} from "#/lib/hevy/types";

type PRRow = {
	id: number;
	exerciseTemplateId: string;
	type: "e1rm" | "volume";
	weightKg: number;
	reps: number;
};

interface Props {
	exercise: WorkoutExercise;
	template: ExerciseTemplate | undefined;
	prs: PRRow[];
}

const MUSCLE_LABELS: Record<string, string> = {
	abdominals: "Abs",
	shoulders: "Shoulders",
	biceps: "Biceps",
	triceps: "Triceps",
	forearms: "Forearms",
	quadriceps: "Quads",
	hamstrings: "Hamstrings",
	calves: "Calves",
	glutes: "Glutes",
	abductors: "Abductors",
	adductors: "Adductors",
	lats: "Lats",
	upper_back: "Upper Back",
	traps: "Traps",
	lower_back: "Lower Back",
	chest: "Chest",
	cardio: "Cardio",
	neck: "Neck",
	full_body: "Full Body",
	other: "Other",
};

const SET_TYPE_LABELS: Record<string, string> = {
	warmup: "Warmup",
	failure: "Failure",
	dropset: "Dropset",
};

function formatWeightReps(set: WorkoutSet): string | null {
	if (set.weight_kg != null && set.reps != null) {
		return `${set.weight_kg} kg × ${set.reps}`;
	}
	if (set.reps != null) return `${set.reps} reps`;
	if (set.duration_seconds != null) {
		const min = Math.floor(set.duration_seconds / 60);
		const sec = set.duration_seconds % 60;
		return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
	}
	if (set.distance_meters != null) {
		return set.distance_meters >= 1000
			? `${(set.distance_meters / 1000).toFixed(2)} km`
			: `${set.distance_meters} m`;
	}
	return null;
}

function isPRSet(set: WorkoutSet, exerciseTemplateId: string, prs: PRRow[]) {
	if (set.weight_kg == null || set.reps == null) return false;
	return prs.some(
		(pr) =>
			pr.exerciseTemplateId === exerciseTemplateId &&
			pr.weightKg === set.weight_kg &&
			pr.reps === set.reps,
	);
}

export function ExerciseBlock({ exercise, template, prs }: Props) {
	const muscle = template
		? (MUSCLE_LABELS[template.primary_muscle_group] ??
			template.primary_muscle_group)
		: null;

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-center gap-2">
					<CardTitle className="font-display text-lg">
						{exercise.title}
					</CardTitle>
					{muscle && <Badge variant="secondary">{muscle}</Badge>}
				</div>
				{exercise.notes && (
					<p className="text-sm italic text-muted-foreground">
						{exercise.notes}
					</p>
				)}
			</CardHeader>
			<CardContent>
				<div className="divide-y divide-border text-sm">
					{exercise.sets.map((set, i) => {
						const label = formatWeightReps(set);
						if (!label) return null;
						const typeLabel =
							set.type !== "normal" ? SET_TYPE_LABELS[set.type] : null;
						const showE1RM =
							(set.type === "normal" || set.type === "failure") &&
							set.weight_kg != null &&
							set.reps != null &&
							set.weight_kg > 0 &&
							set.reps > 0;
						const e1rm = showE1RM
							? Math.round(
									estimated1RM(set.weight_kg as number, set.reps as number) *
										10,
								) / 10
							: null;
						const isPR = isPRSet(set, exercise.exercise_template_id, prs);

						return (
							<div
								key={`${exercise.index}-${set.index}`}
								className="flex items-center gap-3 py-2"
							>
								<span className="w-6 text-xs font-medium text-muted-foreground">
									{i + 1}
								</span>
								{typeLabel && (
									<span className="text-xs uppercase tracking-wide text-muted-foreground">
										{typeLabel}
									</span>
								)}
								<span className="flex-1 tabular-nums">{label}</span>
								{e1rm != null && (
									<span className="text-xs text-muted-foreground tabular-nums">
										e1RM {e1rm} kg
									</span>
								)}
								{isPR && (
									<Badge className="bg-chart-1 text-white hover:bg-chart-1">
										PR
									</Badge>
								)}
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
