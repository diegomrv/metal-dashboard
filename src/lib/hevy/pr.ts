import { estimated1RM, setVolume } from "./metrics";
import type { ExerciseTemplate, Workout } from "./types";

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

export function computePRsFromWorkouts(
	workouts: Workout[],
	templateMap: Map<string, ExerciseTemplate>,
): PRRecord[] {
	const prs: PRRecord[] = [];
	const bests = new Map<string, { e1rm: number; volume: number }>();

	for (const workout of workouts) {
		for (const exercise of workout.exercises) {
			const template = templateMap.get(exercise.exercise_template_id);
			if (!template || template.type !== "weight_reps") continue;

			for (const set of exercise.sets) {
				if (set.type !== "normal" && set.type !== "failure") continue;
				if (set.weight_kg == null || set.reps == null) continue;
				if (set.weight_kg <= 0 || set.reps <= 0) continue;

				const e1rm = estimated1RM(set.weight_kg, set.reps);
				const volume = setVolume(set);
				const current = bests.get(exercise.exercise_template_id) ?? {
					e1rm: 0,
					volume: 0,
				};

				if (e1rm > current.e1rm) {
					prs.push({
						exerciseTemplateId: exercise.exercise_template_id,
						exerciseTitle: exercise.title,
						type: "e1rm",
						value: Math.round(e1rm * 10) / 10,
						weightKg: set.weight_kg,
						reps: set.reps,
						workoutId: workout.id,
						achievedAt: workout.start_time,
						previousValue:
							current.e1rm > 0 ? Math.round(current.e1rm * 10) / 10 : null,
					});
					current.e1rm = e1rm;
				}

				if (volume > current.volume) {
					prs.push({
						exerciseTemplateId: exercise.exercise_template_id,
						exerciseTitle: exercise.title,
						type: "volume",
						value: Math.round(volume * 10) / 10,
						weightKg: set.weight_kg,
						reps: set.reps,
						workoutId: workout.id,
						achievedAt: workout.start_time,
						previousValue:
							current.volume > 0 ? Math.round(current.volume * 10) / 10 : null,
					});
					current.volume = volume;
				}

				bests.set(exercise.exercise_template_id, current);
			}
		}
	}

	return prs;
}

export function findNewPRs(
	workouts: Workout[],
	templateMap: Map<string, ExerciseTemplate>,
	currentBests: Map<string, { e1rm: number; volume: number }>,
): PRRecord[] {
	const prs: PRRecord[] = [];

	for (const workout of workouts) {
		for (const exercise of workout.exercises) {
			const template = templateMap.get(exercise.exercise_template_id);
			if (!template || template.type !== "weight_reps") continue;

			for (const set of exercise.sets) {
				if (set.type !== "normal" && set.type !== "failure") continue;
				if (set.weight_kg == null || set.reps == null) continue;
				if (set.weight_kg <= 0 || set.reps <= 0) continue;

				const e1rm = estimated1RM(set.weight_kg, set.reps);
				const volume = setVolume(set);
				const current = currentBests.get(exercise.exercise_template_id) ?? {
					e1rm: 0,
					volume: 0,
				};

				if (e1rm > current.e1rm) {
					prs.push({
						exerciseTemplateId: exercise.exercise_template_id,
						exerciseTitle: exercise.title,
						type: "e1rm",
						value: Math.round(e1rm * 10) / 10,
						weightKg: set.weight_kg,
						reps: set.reps,
						workoutId: workout.id,
						achievedAt: workout.start_time,
						previousValue:
							current.e1rm > 0 ? Math.round(current.e1rm * 10) / 10 : null,
					});
					current.e1rm = e1rm;
				}

				if (volume > current.volume) {
					prs.push({
						exerciseTemplateId: exercise.exercise_template_id,
						exerciseTitle: exercise.title,
						type: "volume",
						value: Math.round(volume * 10) / 10,
						weightKg: set.weight_kg,
						reps: set.reps,
						workoutId: workout.id,
						achievedAt: workout.start_time,
						previousValue:
							current.volume > 0 ? Math.round(current.volume * 10) / 10 : null,
					});
					current.volume = volume;
				}

				currentBests.set(exercise.exercise_template_id, current);
			}
		}
	}

	return prs;
}
