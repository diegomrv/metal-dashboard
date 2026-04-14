import type {
	ExerciseTemplate,
	MuscleGroup,
	Workout,
	WorkoutSet,
} from "./types";

// --- Date helpers ---

function startOfWeek(date: Date): Date {
	const d = new Date(date);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
	d.setDate(diff);
	d.setHours(0, 0, 0, 0);
	return d;
}

function weekKey(date: Date): string {
	const start = startOfWeek(date);
	return start.toISOString().slice(0, 10);
}

function dayKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function diffMinutes(start: string, end: string): number {
	return (new Date(end).getTime() - new Date(start).getTime()) / 60000;
}

// --- Overview metrics ---

export function totalWorkouts(workouts: Workout[]): number {
	return workouts.length;
}

export function totalDurationHours(workouts: Workout[]): number {
	return (
		workouts.reduce(
			(sum, w) => sum + diffMinutes(w.start_time, w.end_time),
			0,
		) / 60
	);
}

export function avgDurationMinutes(workouts: Workout[]): number {
	if (workouts.length === 0) return 0;
	const total = workouts.reduce(
		(sum, w) => sum + diffMinutes(w.start_time, w.end_time),
		0,
	);
	return total / workouts.length;
}

export function currentStreak(workouts: Workout[]): number {
	if (workouts.length === 0) return 0;

	const weeks = new Set(workouts.map((w) => weekKey(new Date(w.start_time))));
	const sortedWeeks = [...weeks].sort().reverse();

	// Check if most recent week is this week or last week
	const now = new Date();
	const thisWeek = weekKey(now);
	const lastWeek = weekKey(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));

	if (sortedWeeks[0] !== thisWeek && sortedWeeks[0] !== lastWeek) return 0;

	let streak = 0;
	let expected = new Date(sortedWeeks[0]);

	for (const w of sortedWeeks) {
		const wDate = new Date(w);
		// Allow 1 day tolerance for week boundaries
		if (
			Math.abs(wDate.getTime() - expected.getTime()) <
			2 * 24 * 60 * 60 * 1000
		) {
			streak++;
			expected = new Date(expected.getTime() - 7 * 24 * 60 * 60 * 1000);
		} else {
			break;
		}
	}

	return streak;
}

export function workoutsInPeriod(workouts: Workout[], since: Date): number {
	return workouts.filter((w) => new Date(w.start_time) >= since).length;
}

export function workoutsBetween(
	workouts: Workout[],
	start: Date,
	end: Date,
): Workout[] {
	return workouts.filter((w) => {
		const t = new Date(w.start_time).getTime();
		return t >= start.getTime() && t < end.getTime();
	});
}

export function volumeSum(workouts: Workout[]): number {
	let total = 0;
	for (const w of workouts) {
		for (const ex of w.exercises) {
			for (const set of ex.sets) {
				total += setVolume(set);
			}
		}
	}
	return total;
}

export interface WeeklyVolumeDelta {
	thisWeek: number;
	lastWeek: number;
	deltaPct: number | null;
}

export function weeklyVolumeDelta(workouts: Workout[]): WeeklyVolumeDelta {
	const now = new Date();
	const thisWeekStart = startOfWeek(now);
	const lastWeekStart = new Date(
		thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000,
	);
	const nextWeekStart = new Date(
		thisWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000,
	);

	const thisWeek = volumeSum(
		workoutsBetween(workouts, thisWeekStart, nextWeekStart),
	);
	const lastWeek = volumeSum(
		workoutsBetween(workouts, lastWeekStart, thisWeekStart),
	);

	const deltaPct =
		lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : null;

	return { thisWeek, lastWeek, deltaPct };
}

// --- Frequency ---

export interface WeeklyFrequency {
	week: string; // YYYY-MM-DD (Monday)
	label: string; // "Mar 3"
	count: number;
}

export function weeklyFrequency(
	workouts: Workout[],
	weeks: number = 12,
): WeeklyFrequency[] {
	const now = new Date();
	const result: WeeklyFrequency[] = [];

	for (let i = weeks - 1; i >= 0; i--) {
		const weekStart = startOfWeek(
			new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000),
		);
		const key = weekStart.toISOString().slice(0, 10);
		const label = weekStart.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
		result.push({ week: key, label, count: 0 });
	}

	for (const w of workouts) {
		const key = weekKey(new Date(w.start_time));
		const entry = result.find((r) => r.week === key);
		if (entry) entry.count++;
	}

	return result;
}

// Day-level data for calendar heatmap
export interface DayActivity {
	date: string; // YYYY-MM-DD
	count: number;
}

export function dailyActivity(
	workouts: Workout[],
	days: number = 180,
): DayActivity[] {
	const now = new Date();
	const map = new Map<string, number>();

	for (let i = days - 1; i >= 0; i--) {
		const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
		map.set(dayKey(d), 0);
	}

	for (const w of workouts) {
		const key = dayKey(new Date(w.start_time));
		if (map.has(key)) {
			map.set(key, (map.get(key) ?? 0) + 1);
		}
	}

	return [...map.entries()].map(([date, count]) => ({ date, count }));
}

// --- Volume ---

export function setVolume(set: WorkoutSet): number {
	if (set.weight_kg != null && set.reps != null) {
		return set.weight_kg * set.reps;
	}
	return 0;
}

export interface WeeklyVolume {
	week: string;
	label: string;
	volume: number; // total kg lifted
}

export function weeklyVolume(
	workouts: Workout[],
	weeks: number = 12,
): WeeklyVolume[] {
	const now = new Date();
	const result: WeeklyVolume[] = [];

	for (let i = weeks - 1; i >= 0; i--) {
		const weekStart = startOfWeek(
			new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000),
		);
		const key = weekStart.toISOString().slice(0, 10);
		const label = weekStart.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
		result.push({ week: key, label, volume: 0 });
	}

	for (const w of workouts) {
		const key = weekKey(new Date(w.start_time));
		const entry = result.find((r) => r.week === key);
		if (entry) {
			for (const ex of w.exercises) {
				for (const set of ex.sets) {
					entry.volume += setVolume(set);
				}
			}
		}
	}

	return result;
}

// --- Muscle distribution ---

export interface MuscleDistributionEntry {
	muscle: MuscleGroup;
	label: string;
	sets: number;
}

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
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

export function muscleDistribution(
	workouts: Workout[],
	templates: ExerciseTemplate[],
): MuscleDistributionEntry[] {
	const templateMap = new Map(templates.map((t) => [t.id, t]));
	const counts = new Map<MuscleGroup, number>();

	for (const w of workouts) {
		for (const ex of w.exercises) {
			const template = templateMap.get(ex.exercise_template_id);
			if (template) {
				const muscle = template.primary_muscle_group;
				counts.set(muscle, (counts.get(muscle) ?? 0) + ex.sets.length);
			}
		}
	}

	return [...counts.entries()]
		.map(([muscle, sets]) => ({
			muscle,
			label: MUSCLE_LABELS[muscle] ?? muscle,
			sets,
		}))
		.sort((a, b) => b.sets - a.sets);
}

// --- Exercise progression (top lifts) ---

// Epley formula: 1RM = weight * (1 + reps / 30)
export function estimated1RM(weight: number, reps: number): number {
	if (reps <= 0 || weight <= 0) return weight;
	if (reps === 1) return weight;
	return weight * (1 + reps / 30);
}

export interface ExerciseProgressionEntry {
	date: string;
	e1rm: number;
}

export interface TopExercise {
	templateId: string;
	title: string;
	totalSets: number;
	progression: ExerciseProgressionEntry[];
	pr: { weight: number; reps: number; e1rm: number } | null;
}

export function topExercises(
	workouts: Workout[],
	templates: ExerciseTemplate[],
	limit: number = 5,
): TopExercise[] {
	// Count sets per exercise to find top performed
	const setCounts = new Map<string, number>();
	for (const w of workouts) {
		for (const ex of w.exercises) {
			const working = ex.sets.filter(
				(s) => s.type === "normal" || s.type === "failure",
			);
			setCounts.set(
				ex.exercise_template_id,
				(setCounts.get(ex.exercise_template_id) ?? 0) + working.length,
			);
		}
	}

	// Filter to weight_reps exercises only
	const weightTemplates = new Set(
		templates.filter((t) => t.type === "weight_reps").map((t) => t.id),
	);

	const topIds = [...setCounts.entries()]
		.filter(([id]) => weightTemplates.has(id))
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([id]) => id);

	const templateMap = new Map(templates.map((t) => [t.id, t]));

	// Sort workouts chronologically
	const sorted = [...workouts].sort(
		(a, b) =>
			new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
	);

	return topIds.map((templateId) => {
		const template = templateMap.get(templateId);
		const progression: ExerciseProgressionEntry[] = [];
		let pr: TopExercise["pr"] = null;

		for (const w of sorted) {
			for (const ex of w.exercises) {
				if (ex.exercise_template_id !== templateId) continue;

				let bestE1rm = 0;
				for (const set of ex.sets) {
					if (set.type !== "normal" && set.type !== "failure") continue;
					if (set.weight_kg == null || set.reps == null) continue;

					const e1rm = estimated1RM(set.weight_kg, set.reps);
					if (e1rm > bestE1rm) bestE1rm = e1rm;

					if (!pr || e1rm > pr.e1rm) {
						pr = {
							weight: set.weight_kg,
							reps: set.reps,
							e1rm: Math.round(e1rm * 10) / 10,
						};
					}
				}

				if (bestE1rm > 0) {
					progression.push({
						date: w.start_time.slice(0, 10),
						e1rm: Math.round(bestE1rm * 10) / 10,
					});
				}
			}
		}

		return {
			templateId,
			title: template?.title ?? templateId,
			totalSets: setCounts.get(templateId) ?? 0,
			progression,
			pr,
		};
	});
}

// --- Recent workouts ---

export interface RecentWorkout {
	id: string;
	title: string;
	date: string;
	durationMin: number;
	exerciseCount: number;
	totalVolume: number;
	totalSets: number;
}

export function recentWorkouts(
	workouts: Workout[],
	limit: number = 10,
): RecentWorkout[] {
	return [...workouts]
		.sort(
			(a, b) =>
				new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
		)
		.slice(0, limit)
		.map((w) => {
			let totalVolume = 0;
			let totalSets = 0;
			for (const ex of w.exercises) {
				for (const set of ex.sets) {
					totalVolume += setVolume(set);
					totalSets++;
				}
			}

			return {
				id: w.id,
				title: w.title,
				date: w.start_time,
				durationMin: Math.round(diffMinutes(w.start_time, w.end_time)),
				exerciseCount: w.exercises.length,
				totalVolume: Math.round(totalVolume),
				totalSets,
			};
		});
}
