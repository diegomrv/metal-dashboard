import { describe, expect, it } from "vitest";
import { computePRsFromWorkouts, findNewPRs } from "./pr";
import type { ExerciseTemplate, Workout } from "./types";

function makeWorkout(overrides: Partial<Workout> & { id: string }): Workout {
	return {
		title: "Workout",
		routine_id: null,
		description: null,
		start_time: "2026-01-01T10:00:00Z",
		end_time: "2026-01-01T11:00:00Z",
		updated_at: "2026-01-01T11:00:00Z",
		created_at: "2026-01-01T10:00:00Z",
		exercises: [],
		...overrides,
	};
}

const benchTemplate: ExerciseTemplate = {
	id: "bench-001",
	title: "Bench Press",
	type: "weight_reps",
	primary_muscle_group: "chest",
	secondary_muscle_groups: ["triceps", "shoulders"],
	is_custom: false,
};

const cardioTemplate: ExerciseTemplate = {
	id: "run-001",
	title: "Running",
	type: "duration",
	primary_muscle_group: "cardio",
	secondary_muscle_groups: [],
	is_custom: false,
};

const templateMap = new Map([
	["bench-001", benchTemplate],
	["run-001", cardioTemplate],
]);

describe("computePRsFromWorkouts", () => {
	it("does not produce PRs for an exercise's first appearance", () => {
		const workouts: Workout[] = [
			makeWorkout({
				id: "w1",
				exercises: [
					{
						index: 0,
						title: "Bench Press",
						notes: null,
						exercise_template_id: "bench-001",
						supersets_id: null,
						sets: [
							{
								index: 0,
								type: "normal",
								weight_kg: 80,
								reps: 8,
								distance_meters: null,
								duration_seconds: null,
								rpe: null,
								custom_metric: null,
							},
						],
					},
				],
			}),
		];

		const prs = computePRsFromWorkouts(workouts, templateMap);
		expect(prs).toHaveLength(0);
	});

	it("detects new PR when second workout beats first", () => {
		const workouts: Workout[] = [
			makeWorkout({
				id: "w1",
				start_time: "2026-01-01T10:00:00Z",
				exercises: [
					{
						index: 0,
						title: "Bench Press",
						notes: null,
						exercise_template_id: "bench-001",
						supersets_id: null,
						sets: [
							{
								index: 0,
								type: "normal",
								weight_kg: 80,
								reps: 8,
								distance_meters: null,
								duration_seconds: null,
								rpe: null,
								custom_metric: null,
							},
						],
					},
				],
			}),
			makeWorkout({
				id: "w2",
				start_time: "2026-01-08T10:00:00Z",
				exercises: [
					{
						index: 0,
						title: "Bench Press",
						notes: null,
						exercise_template_id: "bench-001",
						supersets_id: null,
						sets: [
							{
								index: 0,
								type: "normal",
								weight_kg: 85,
								reps: 8,
								distance_meters: null,
								duration_seconds: null,
								rpe: null,
								custom_metric: null,
							},
						],
					},
				],
			}),
		];

		const prs = computePRsFromWorkouts(workouts, templateMap);

		expect(prs).toHaveLength(2);
		expect(prs.every((p) => p.workoutId === "w2")).toBe(true);
		expect(prs[0].previousValue).not.toBeNull();
	});

	it("skips non-weight_reps exercises", () => {
		const workouts: Workout[] = [
			makeWorkout({
				id: "w1",
				exercises: [
					{
						index: 0,
						title: "Running",
						notes: null,
						exercise_template_id: "run-001",
						supersets_id: null,
						sets: [
							{
								index: 0,
								type: "normal",
								weight_kg: null,
								reps: null,
								distance_meters: 5000,
								duration_seconds: 1800,
								rpe: null,
								custom_metric: null,
							},
						],
					},
				],
			}),
		];

		const prs = computePRsFromWorkouts(workouts, templateMap);
		expect(prs).toHaveLength(0);
	});

	it("skips warmup and dropset set types", () => {
		const workouts: Workout[] = [
			makeWorkout({
				id: "w1",
				exercises: [
					{
						index: 0,
						title: "Bench Press",
						notes: null,
						exercise_template_id: "bench-001",
						supersets_id: null,
						sets: [
							{
								index: 0,
								type: "warmup",
								weight_kg: 60,
								reps: 10,
								distance_meters: null,
								duration_seconds: null,
								rpe: null,
								custom_metric: null,
							},
							{
								index: 1,
								type: "dropset",
								weight_kg: 50,
								reps: 15,
								distance_meters: null,
								duration_seconds: null,
								rpe: null,
								custom_metric: null,
							},
						],
					},
				],
			}),
		];

		const prs = computePRsFromWorkouts(workouts, templateMap);
		expect(prs).toHaveLength(0);
	});

	it("does not produce PR when second workout is weaker", () => {
		const workouts: Workout[] = [
			makeWorkout({
				id: "w1",
				start_time: "2026-01-01T10:00:00Z",
				exercises: [
					{
						index: 0,
						title: "Bench Press",
						notes: null,
						exercise_template_id: "bench-001",
						supersets_id: null,
						sets: [
							{
								index: 0,
								type: "normal",
								weight_kg: 100,
								reps: 5,
								distance_meters: null,
								duration_seconds: null,
								rpe: null,
								custom_metric: null,
							},
						],
					},
				],
			}),
			makeWorkout({
				id: "w2",
				start_time: "2026-01-08T10:00:00Z",
				exercises: [
					{
						index: 0,
						title: "Bench Press",
						notes: null,
						exercise_template_id: "bench-001",
						supersets_id: null,
						sets: [
							{
								index: 0,
								type: "normal",
								weight_kg: 80,
								reps: 5,
								distance_meters: null,
								duration_seconds: null,
								rpe: null,
								custom_metric: null,
							},
						],
					},
				],
			}),
		];

		const prs = computePRsFromWorkouts(workouts, templateMap);
		expect(prs).toHaveLength(0);
	});
});

describe("findNewPRs", () => {
	it("detects PRs against provided bests", () => {
		const currentBests = new Map([["bench-001", { e1rm: 100, volume: 400 }]]);

		const workouts: Workout[] = [
			makeWorkout({
				id: "w3",
				exercises: [
					{
						index: 0,
						title: "Bench Press",
						notes: null,
						exercise_template_id: "bench-001",
						supersets_id: null,
						sets: [
							{
								index: 0,
								type: "normal",
								weight_kg: 100,
								reps: 8,
								distance_meters: null,
								duration_seconds: null,
								rpe: null,
								custom_metric: null,
							},
						],
					},
				],
			}),
		];

		const prs = findNewPRs(workouts, templateMap, currentBests);
		expect(prs).toHaveLength(2);
		expect(prs[0].type).toBe("e1rm");
		expect(prs[0].previousValue).toBe(100);
		expect(prs[1].type).toBe("volume");
		expect(prs[1].previousValue).toBe(400);
	});

	it("emits at most one e1rm and one volume PR per exercise for a ramp", () => {
		const currentBests = new Map([["bench-001", { e1rm: 1, volume: 1 }]]);
		const workouts: Workout[] = [
			makeWorkout({
				id: "w1",
				exercises: [
					{
						index: 0,
						title: "Bench Press",
						notes: null,
						exercise_template_id: "bench-001",
						supersets_id: null,
						sets: [
							{
								index: 0,
								type: "normal",
								weight_kg: 60,
								reps: 15,
								distance_meters: null,
								duration_seconds: null,
								rpe: null,
								custom_metric: null,
							},
							{
								index: 1,
								type: "normal",
								weight_kg: 70,
								reps: 12,
								distance_meters: null,
								duration_seconds: null,
								rpe: null,
								custom_metric: null,
							},
							{
								index: 2,
								type: "normal",
								weight_kg: 80,
								reps: 10,
								distance_meters: null,
								duration_seconds: null,
								rpe: null,
								custom_metric: null,
							},
						],
					},
				],
			}),
		];

		const prs = findNewPRs(workouts, templateMap, currentBests);
		const e1rm = prs.filter((p) => p.type === "e1rm");
		const volume = prs.filter((p) => p.type === "volume");
		expect(e1rm).toHaveLength(1);
		expect(volume).toHaveLength(1);
		expect(e1rm[0].weightKg).toBe(80);
		expect(e1rm[0].reps).toBe(10);
	});

	it("emits only a volume PR when e1rm does not improve", () => {
		const currentBests = new Map([["bench-001", { e1rm: 10000, volume: 100 }]]);
		const workouts: Workout[] = [
			makeWorkout({
				id: "w2",
				exercises: [
					{
						index: 0,
						title: "Bench Press",
						notes: null,
						exercise_template_id: "bench-001",
						supersets_id: null,
						sets: [
							{
								index: 0,
								type: "normal",
								weight_kg: 60,
								reps: 20,
								distance_meters: null,
								duration_seconds: null,
								rpe: null,
								custom_metric: null,
							},
						],
					},
				],
			}),
		];

		const prs = findNewPRs(workouts, templateMap, currentBests);
		expect(prs).toHaveLength(1);
		expect(prs[0].type).toBe("volume");
	});

	it("returns empty when no records broken", () => {
		const currentBests = new Map([["bench-001", { e1rm: 200, volume: 2000 }]]);

		const workouts: Workout[] = [
			makeWorkout({
				id: "w3",
				exercises: [
					{
						index: 0,
						title: "Bench Press",
						notes: null,
						exercise_template_id: "bench-001",
						supersets_id: null,
						sets: [
							{
								index: 0,
								type: "normal",
								weight_kg: 80,
								reps: 5,
								distance_meters: null,
								duration_seconds: null,
								rpe: null,
								custom_metric: null,
							},
						],
					},
				],
			}),
		];

		const prs = findNewPRs(workouts, templateMap, currentBests);
		expect(prs).toHaveLength(0);
	});
});
