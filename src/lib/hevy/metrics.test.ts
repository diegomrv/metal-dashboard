import { describe, expect, it } from "vitest";
import { estimated1RM, setVolume } from "./metrics";
import type { WorkoutSet } from "./types";

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
