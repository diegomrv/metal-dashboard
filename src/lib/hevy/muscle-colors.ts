import type { MuscleGroup } from "./types";

export const MUSCLE_COLORS: Record<string, string> = {
	chest: "var(--chart-cat-1)",
	upper_back: "var(--chart-cat-6)",
	lats: "var(--chart-cat-7)",
	shoulders: "var(--chart-cat-2)",
	quadriceps: "var(--chart-cat-4)",
	hamstrings: "var(--chart-cat-5)",
	glutes: "var(--chart-cat-9)",
	biceps: "var(--chart-cat-3)",
	triceps: "var(--chart-cat-8)",
	calves: "var(--chart-cat-6)",
	abdominals: "var(--chart-cat-5)",
	forearms: "var(--chart-cat-2)",
	traps: "var(--chart-cat-7)",
	lower_back: "var(--chart-cat-4)",
	abductors: "var(--chart-cat-10)",
	adductors: "var(--chart-cat-1)",
	neck: "var(--chart-cat-8)",
};

export const CATEGORICAL_PALETTE = [
	"var(--chart-cat-1)",
	"var(--chart-cat-2)",
	"var(--chart-cat-3)",
	"var(--chart-cat-4)",
	"var(--chart-cat-5)",
	"var(--chart-cat-6)",
	"var(--chart-cat-7)",
	"var(--chart-cat-8)",
	"var(--chart-cat-9)",
	"var(--chart-cat-10)",
];

export function muscleColor(
	muscle: MuscleGroup | string,
	fallbackIndex = 0,
): string {
	return (
		MUSCLE_COLORS[muscle] ??
		CATEGORICAL_PALETTE[fallbackIndex % CATEGORICAL_PALETTE.length]
	);
}
