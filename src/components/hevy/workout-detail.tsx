import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { setVolume } from "#/lib/hevy/metrics";
import type { ExerciseTemplate, Workout } from "#/lib/hevy/types";
import { ExerciseBlock } from "./exercise-block";

type PRRow = {
	id: number;
	exerciseTemplateId: string;
	type: "e1rm" | "volume";
	weightKg: number;
	reps: number;
};

interface Props {
	workout: Workout;
	templates: ExerciseTemplate[];
	prs: PRRow[];
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	});
}

function formatDuration(startIso: string, endIso: string): string {
	const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
	const mins = Math.max(0, Math.round(ms / 60000));
	if (mins < 60) return `${mins} min`;
	const h = Math.floor(mins / 60);
	const m = mins % 60;
	return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatVolume(kg: number): string {
	if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k kg`;
	return `${Math.round(kg).toLocaleString()} kg`;
}

export function WorkoutDetail({ workout, templates, prs }: Props) {
	const templateMap = new Map(templates.map((t) => [t.id, t]));

	let totalVolume = 0;
	let totalSets = 0;
	for (const ex of workout.exercises) {
		for (const set of ex.sets) {
			totalVolume += setVolume(set);
			totalSets += 1;
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<Card className="rise-in">
				<CardHeader>
					<CardTitle className="font-display text-2xl">
						{workout.title}
					</CardTitle>
					<CardDescription className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
						<span>{formatDate(workout.start_time)}</span>
						<span>{formatDuration(workout.start_time, workout.end_time)}</span>
						<span>{workout.exercises.length} exercises</span>
						<span>{totalSets} sets</span>
						{totalVolume > 0 && <span>{formatVolume(totalVolume)}</span>}
					</CardDescription>
				</CardHeader>
			</Card>

			{workout.exercises.map((exercise) => (
				<ExerciseBlock
					key={`${exercise.index}-${exercise.exercise_template_id}`}
					exercise={exercise}
					template={templateMap.get(exercise.exercise_template_id)}
					prs={prs}
				/>
			))}
		</div>
	);
}
