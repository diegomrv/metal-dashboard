import { estimated1RM, setVolume } from "./metrics";
import type { ExerciseTemplate, Workout, WorkoutExercise } from "./types";

export interface PRRecord {
	exerciseTemplateId: string;
	exerciseTitle: string;
	type: "e1rm" | "volume";
	value: number;
	weightKg: number;
	reps: number;
	workoutId: string;
	achievedAt: string;
	previousValue: number | null;
}

interface BestSet {
	value: number;
	weightKg: number;
	reps: number;
}

function bestSetsForExercise(
	exercise: WorkoutExercise,
	templateMap: Map<string, ExerciseTemplate>,
): { bestE1rm: BestSet | null; bestVolume: BestSet | null } {
	const template = templateMap.get(exercise.exercise_template_id);
	if (!template || template.type !== "weight_reps") {
		return { bestE1rm: null, bestVolume: null };
	}

	let bestE1rm: BestSet | null = null;
	let bestVolume: BestSet | null = null;

	for (const set of exercise.sets) {
		if (set.type !== "normal" && set.type !== "failure") continue;
		if (set.weight_kg == null || set.reps == null) continue;
		if (set.weight_kg <= 0 || set.reps <= 0) continue;

		const e1rm = estimated1RM(set.weight_kg, set.reps);
		const volume = setVolume(set);

		if (!bestE1rm || e1rm > bestE1rm.value) {
			bestE1rm = { value: e1rm, weightKg: set.weight_kg, reps: set.reps };
		}
		if (!bestVolume || volume > bestVolume.value) {
			bestVolume = { value: volume, weightKg: set.weight_kg, reps: set.reps };
		}
	}

	return { bestE1rm, bestVolume };
}

function emitPRsForWorkout(
	workout: Workout,
	templateMap: Map<string, ExerciseTemplate>,
	bests: Map<string, { e1rm: number; volume: number }>,
	out: PRRecord[],
): void {
	for (const exercise of workout.exercises) {
		const { bestE1rm, bestVolume } = bestSetsForExercise(exercise, templateMap);
		if (!bestE1rm && !bestVolume) continue;

		const existing = bests.get(exercise.exercise_template_id);
		const isFirstAppearance = !existing;
		const current = existing ?? { e1rm: 0, volume: 0 };

		if (isFirstAppearance) {
			if (bestE1rm) current.e1rm = bestE1rm.value;
			if (bestVolume) current.volume = bestVolume.value;
			bests.set(exercise.exercise_template_id, current);
			continue;
		}

		if (bestE1rm && bestE1rm.value > current.e1rm) {
			out.push({
				exerciseTemplateId: exercise.exercise_template_id,
				exerciseTitle: exercise.title,
				type: "e1rm",
				value: Math.round(bestE1rm.value * 10) / 10,
				weightKg: bestE1rm.weightKg,
				reps: bestE1rm.reps,
				workoutId: workout.id,
				achievedAt: workout.start_time,
				previousValue:
					current.e1rm > 0 ? Math.round(current.e1rm * 10) / 10 : null,
			});
			current.e1rm = bestE1rm.value;
		}

		if (bestVolume && bestVolume.value > current.volume) {
			out.push({
				exerciseTemplateId: exercise.exercise_template_id,
				exerciseTitle: exercise.title,
				type: "volume",
				value: Math.round(bestVolume.value * 10) / 10,
				weightKg: bestVolume.weightKg,
				reps: bestVolume.reps,
				workoutId: workout.id,
				achievedAt: workout.start_time,
				previousValue:
					current.volume > 0 ? Math.round(current.volume * 10) / 10 : null,
			});
			current.volume = bestVolume.value;
		}

		bests.set(exercise.exercise_template_id, current);
	}
}

export function computePRsFromWorkouts(
	workouts: Workout[],
	templateMap: Map<string, ExerciseTemplate>,
): PRRecord[] {
	const prs: PRRecord[] = [];
	const bests = new Map<string, { e1rm: number; volume: number }>();

	for (const workout of workouts) {
		emitPRsForWorkout(workout, templateMap, bests, prs);
	}

	return prs;
}

export function findNewPRs(
	workouts: Workout[],
	templateMap: Map<string, ExerciseTemplate>,
	currentBests: Map<string, { e1rm: number; volume: number }>,
): PRRecord[] {
	const prs: PRRecord[] = [];
	const bests = new Map(currentBests);

	const sorted = [...workouts].sort(
		(a, b) =>
			new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
	);

	for (const workout of sorted) {
		emitPRsForWorkout(workout, templateMap, bests, prs);
	}

	return prs;
}
