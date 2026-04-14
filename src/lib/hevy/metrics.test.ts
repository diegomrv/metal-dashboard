import { describe, expect, it } from "vitest";
import {
	daysSinceMuscleTrained,
	estimated1RM,
	muscleDistribution,
	plateauedExercises,
	previousSessionDeltas,
	repRangeDistribution,
	sessionMuscleBreakdown,
	sessionVsAverage,
	setVolume,
	weeklySetsPerMuscle,
} from "./metrics";
import type {
	ExerciseTemplate,
	Workout,
	WorkoutExercise,
	WorkoutSet,
} from "./types";

function makeTemplate(
	overrides: Partial<ExerciseTemplate> & { id: string },
): ExerciseTemplate {
	return {
		id: overrides.id,
		title: overrides.title ?? overrides.id,
		type: overrides.type ?? "weight_reps",
		primary_muscle_group: overrides.primary_muscle_group ?? "chest",
		secondary_muscle_groups: overrides.secondary_muscle_groups ?? [],
		is_custom: overrides.is_custom ?? false,
	};
}

function makeExercise(
	templateId: string,
	sets: Partial<WorkoutSet>[],
): WorkoutExercise {
	return {
		index: 0,
		title: templateId,
		notes: null,
		exercise_template_id: templateId,
		supersets_id: null,
		sets: sets.map((s, i) => ({
			index: i,
			type: "normal",
			weight_kg: null,
			reps: null,
			distance_meters: null,
			duration_seconds: null,
			rpe: null,
			custom_metric: null,
			...s,
		})),
	};
}

function makeWorkout(
	overrides: Partial<Workout> & { id: string; start_time: string },
): Workout {
	return {
		id: overrides.id,
		title: overrides.title ?? "W",
		routine_id: null,
		description: null,
		start_time: overrides.start_time,
		end_time:
			overrides.end_time ??
			new Date(
				new Date(overrides.start_time).getTime() + 60 * 60 * 1000,
			).toISOString(),
		updated_at: overrides.start_time,
		created_at: overrides.start_time,
		exercises: overrides.exercises ?? [],
	};
}

function makeSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
	return {
		index: 0,
		type: "normal",
		weight_kg: null,
		reps: null,
		distance_meters: null,
		duration_seconds: null,
		rpe: null,
		custom_metric: null,
		...overrides,
	};
}

describe("estimated1RM", () => {
	it("returns weight for 1 rep", () => {
		expect(estimated1RM(100, 1)).toBe(100);
	});

	it("applies Epley formula for multiple reps", () => {
		// 100 * (1 + 10/30) = 133.33...
		expect(estimated1RM(100, 10)).toBeCloseTo(133.33, 1);
	});

	it("returns weight when reps <= 0", () => {
		expect(estimated1RM(100, 0)).toBe(100);
		expect(estimated1RM(100, -1)).toBe(100);
	});

	it("returns weight when weight <= 0", () => {
		expect(estimated1RM(0, 5)).toBe(0);
	});
});

describe("setVolume", () => {
	it("returns weight * reps", () => {
		expect(setVolume(makeSet({ weight_kg: 100, reps: 10 }))).toBe(1000);
	});

	it("returns 0 when weight_kg is null", () => {
		expect(setVolume(makeSet({ weight_kg: null, reps: 10 }))).toBe(0);
	});

	it("returns 0 when reps is null", () => {
		expect(setVolume(makeSet({ weight_kg: 100, reps: null }))).toBe(0);
	});
});

describe("repRangeDistribution", () => {
	it("buckets sets by rep count and ignores warmups / missing reps", () => {
		const w = makeWorkout({
			id: "1",
			start_time: "2026-04-01T10:00:00Z",
			exercises: [
				makeExercise("bench", [
					{ weight_kg: 100, reps: 3 },
					{ weight_kg: 80, reps: 10 },
					{ weight_kg: 40, reps: 20 },
					{ weight_kg: 40, reps: 15, type: "warmup" },
					{ weight_kg: 40, reps: null },
				]),
			],
		});
		expect(repRangeDistribution([w])).toEqual({
			strength: 1,
			hypertrophy: 1,
			endurance: 1,
			total: 3,
		});
	});

	it("returns zeros for empty workouts", () => {
		expect(repRangeDistribution([])).toEqual({
			strength: 0,
			hypertrophy: 0,
			endurance: 0,
			total: 0,
		});
	});
});

describe("weeklySetsPerMuscle", () => {
	it("counts primary at 1.0 and secondary at 0.5 per working set", () => {
		const templates = [
			makeTemplate({
				id: "t1",
				primary_muscle_group: "chest",
				secondary_muscle_groups: ["triceps"],
			}),
		];
		const w = makeWorkout({
			id: "1",
			start_time: new Date().toISOString(),
			exercises: [
				makeExercise("t1", [
					{ weight_kg: 100, reps: 5 },
					{ weight_kg: 100, reps: 5 },
				]),
			],
		});
		const result = weeklySetsPerMuscle([w], templates, 12);
		const last = result[result.length - 1];
		expect(last.sets.chest).toBe(2);
		expect(last.sets.triceps).toBe(1);
	});
});

describe("daysSinceMuscleTrained", () => {
	it("calculates days since last primary or secondary activation", () => {
		const templates = [
			makeTemplate({
				id: "t1",
				primary_muscle_group: "chest",
				secondary_muscle_groups: ["triceps"],
			}),
		];
		const asOf = new Date("2026-04-15T12:00:00Z");
		const w = makeWorkout({
			id: "1",
			start_time: "2026-04-10T10:00:00Z",
			exercises: [makeExercise("t1", [{ weight_kg: 100, reps: 5 }])],
		});
		const result = daysSinceMuscleTrained([w], templates, asOf);
		const chest = result.find((r) => r.muscle === "chest");
		const triceps = result.find((r) => r.muscle === "triceps");
		const biceps = result.find((r) => r.muscle === "biceps");
		expect(chest?.days).toBe(5);
		expect(triceps?.days).toBe(5);
		expect(biceps?.days).toBe(Number.POSITIVE_INFINITY);
		expect(biceps?.lastDate).toBeNull();
	});
});

describe("muscleDistribution", () => {
	it("includes secondary at 0.5 when enabled", () => {
		const templates = [
			makeTemplate({
				id: "t1",
				primary_muscle_group: "chest",
				secondary_muscle_groups: ["triceps", "shoulders"],
			}),
		];
		const w = makeWorkout({
			id: "1",
			start_time: "2026-04-10T10:00:00Z",
			exercises: [
				makeExercise("t1", [
					{ weight_kg: 100, reps: 5 },
					{ weight_kg: 100, reps: 5 },
				]),
			],
		});
		const result = muscleDistribution([w], templates);
		const chest = result.find((r) => r.muscle === "chest");
		const triceps = result.find((r) => r.muscle === "triceps");
		expect(chest?.sets).toBe(2);
		expect(triceps?.sets).toBe(1);
	});

	it("excludes secondary when opts.includeSecondary is false", () => {
		const templates = [
			makeTemplate({
				id: "t1",
				primary_muscle_group: "chest",
				secondary_muscle_groups: ["triceps"],
			}),
		];
		const w = makeWorkout({
			id: "1",
			start_time: "2026-04-10T10:00:00Z",
			exercises: [makeExercise("t1", [{ weight_kg: 100, reps: 5 }])],
		});
		const result = muscleDistribution([w], templates, {
			includeSecondary: false,
		});
		expect(result.find((r) => r.muscle === "triceps")).toBeUndefined();
	});
});

describe("plateauedExercises", () => {
	it("flags exercises that haven't PR'd in >= weeksThreshold", () => {
		const templates = [makeTemplate({ id: "bench" })];
		const oldDate = new Date(Date.now() - 6 * 7 * 24 * 60 * 60 * 1000);
		const exercises = Array.from({ length: 25 }, () =>
			makeExercise("bench", [{ weight_kg: 100, reps: 5 }]),
		);
		const w = makeWorkout({
			id: "1",
			start_time: oldDate.toISOString(),
			exercises,
		});
		const result = plateauedExercises([w], templates, {
			weeksThreshold: 4,
			minSets: 20,
		});
		expect(result).toHaveLength(1);
		expect(result[0].templateId).toBe("bench");
		expect(result[0].weeksStale).toBeGreaterThanOrEqual(4);
	});

	it("ignores exercises with fewer than minSets", () => {
		const templates = [makeTemplate({ id: "bench" })];
		const oldDate = new Date(Date.now() - 6 * 7 * 24 * 60 * 60 * 1000);
		const w = makeWorkout({
			id: "1",
			start_time: oldDate.toISOString(),
			exercises: [makeExercise("bench", [{ weight_kg: 100, reps: 5 }])],
		});
		expect(plateauedExercises([w], templates, { minSets: 20 })).toEqual([]);
	});
});

describe("previousSessionDeltas", () => {
	it("computes signed deltas vs most recent prior session with same exercise", () => {
		const prior = makeWorkout({
			id: "w1",
			start_time: "2026-04-01T10:00:00Z",
			exercises: [
				makeExercise("bench", [
					{ weight_kg: 100, reps: 5 },
					{ weight_kg: 100, reps: 5 },
				]),
			],
		});
		const current = makeWorkout({
			id: "w2",
			start_time: "2026-04-08T10:00:00Z",
			exercises: [
				makeExercise("bench", [
					{ weight_kg: 105, reps: 5 },
					{ weight_kg: 105, reps: 5 },
					{ weight_kg: 105, reps: 5 },
				]),
			],
		});
		const deltas = previousSessionDeltas(current, [prior, current]);
		expect(deltas).toHaveLength(1);
		expect(deltas[0].previousWorkoutId).toBe("w1");
		expect(deltas[0].setCountDelta).toBe(1);
		expect(deltas[0].volumeDelta).toBeGreaterThan(0);
		expect(deltas[0].topE1rmDelta).toBeGreaterThan(0);
	});

	it("returns null previous when no prior session contains the exercise", () => {
		const w = makeWorkout({
			id: "w1",
			start_time: "2026-04-08T10:00:00Z",
			exercises: [makeExercise("bench", [{ weight_kg: 100, reps: 5 }])],
		});
		const deltas = previousSessionDeltas(w, [w]);
		expect(deltas[0].previousWorkoutId).toBeNull();
	});
});

describe("sessionMuscleBreakdown", () => {
	it("returns primary + 0.5 secondary per working set, sorted desc", () => {
		const templates = [
			makeTemplate({
				id: "t1",
				primary_muscle_group: "chest",
				secondary_muscle_groups: ["triceps"],
			}),
		];
		const w = makeWorkout({
			id: "1",
			start_time: "2026-04-10T10:00:00Z",
			exercises: [
				makeExercise("t1", [
					{ weight_kg: 100, reps: 5 },
					{ weight_kg: 100, reps: 5 },
				]),
			],
		});
		const result = sessionMuscleBreakdown(w, templates);
		expect(result[0].muscle).toBe("chest");
		expect(result[0].sets).toBe(2);
		expect(result[1].muscle).toBe("triceps");
		expect(result[1].sets).toBe(1);
	});
});

describe("sessionVsAverage", () => {
	it("computes signed percent deltas vs baseline average", () => {
		const mk = (id: string, day: number, volume: number) =>
			makeWorkout({
				id,
				start_time: new Date(
					new Date("2026-04-10T10:00:00Z").getTime() -
						day * 24 * 60 * 60 * 1000,
				).toISOString(),
				end_time: new Date(
					new Date("2026-04-10T10:00:00Z").getTime() -
						day * 24 * 60 * 60 * 1000 +
						60 * 60 * 1000,
				).toISOString(),
				exercises: [makeExercise("t1", [{ weight_kg: volume / 5, reps: 5 }])],
			});
		const current = mk("cur", 0, 600);
		const baseA = mk("a", 3, 400);
		const baseB = mk("b", 7, 400);
		const result = sessionVsAverage(current, [current, baseA, baseB], {
			weeks: 4,
		});
		expect(result?.baselineCount).toBe(2);
		expect(result?.volumePct).toBeCloseTo(50, 0);
	});

	it("returns null when baseline is empty", () => {
		const w = makeWorkout({
			id: "1",
			start_time: "2026-04-10T10:00:00Z",
			exercises: [],
		});
		expect(sessionVsAverage(w, [w])).toBeNull();
	});
});
