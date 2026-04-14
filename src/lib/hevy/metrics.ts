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

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
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
	opts: { includeSecondary?: boolean } = {},
): MuscleDistributionEntry[] {
	const includeSecondary = opts.includeSecondary ?? true;
	const templateMap = new Map(templates.map((t) => [t.id, t]));
	const counts = new Map<MuscleGroup, number>();

	for (const w of workouts) {
		for (const ex of w.exercises) {
			const template = templateMap.get(ex.exercise_template_id);
			if (!template) continue;
			const working = ex.sets.filter(
				(s) => s.type === "normal" || s.type === "failure",
			).length;
			if (working === 0) continue;
			const primary = template.primary_muscle_group;
			counts.set(primary, (counts.get(primary) ?? 0) + working);
			if (includeSecondary) {
				for (const sec of template.secondary_muscle_groups) {
					counts.set(sec, (counts.get(sec) ?? 0) + working * 0.5);
				}
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

export interface RepRangeDistribution {
	strength: number;
	hypertrophy: number;
	endurance: number;
	total: number;
}

export function repRangeDistribution(
	workouts: Workout[],
	since?: Date,
): RepRangeDistribution {
	let strength = 0;
	let hypertrophy = 0;
	let endurance = 0;

	for (const w of workouts) {
		if (since && new Date(w.start_time) < since) continue;
		for (const ex of w.exercises) {
			for (const set of ex.sets) {
				if (set.type !== "normal" && set.type !== "failure") continue;
				if (set.reps == null || set.reps <= 0) continue;
				if (set.reps <= 5) strength++;
				else if (set.reps <= 12) hypertrophy++;
				else endurance++;
			}
		}
	}

	return {
		strength,
		hypertrophy,
		endurance,
		total: strength + hypertrophy + endurance,
	};
}

export interface WeeklyMuscleSets {
	week: string;
	label: string;
	sets: Record<MuscleGroup, number>;
}

function emptyMuscleRecord(): Record<MuscleGroup, number> {
	const keys = Object.keys(MUSCLE_LABELS) as MuscleGroup[];
	const rec = {} as Record<MuscleGroup, number>;
	for (const k of keys) rec[k] = 0;
	return rec;
}

export function weeklySetsPerMuscle(
	workouts: Workout[],
	templates: ExerciseTemplate[],
	weeks: number = 12,
): WeeklyMuscleSets[] {
	const now = new Date();
	const result: WeeklyMuscleSets[] = [];

	for (let i = weeks - 1; i >= 0; i--) {
		const weekStart = startOfWeek(
			new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000),
		);
		const key = weekStart.toISOString().slice(0, 10);
		const label = weekStart.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
		result.push({ week: key, label, sets: emptyMuscleRecord() });
	}

	const templateMap = new Map(templates.map((t) => [t.id, t]));

	for (const w of workouts) {
		const key = weekKey(new Date(w.start_time));
		const entry = result.find((r) => r.week === key);
		if (!entry) continue;
		for (const ex of w.exercises) {
			const template = templateMap.get(ex.exercise_template_id);
			if (!template) continue;
			const working = ex.sets.filter(
				(s) => s.type === "normal" || s.type === "failure",
			).length;
			if (working === 0) continue;
			entry.sets[template.primary_muscle_group] += working;
			for (const sec of template.secondary_muscle_groups) {
				entry.sets[sec] += working * 0.5;
			}
		}
	}

	return result;
}

export interface MuscleRecoveryEntry {
	muscle: MuscleGroup;
	label: string;
	days: number;
	lastDate: string | null;
}

export function daysSinceMuscleTrained(
	workouts: Workout[],
	templates: ExerciseTemplate[],
	asOf: Date = new Date(),
): MuscleRecoveryEntry[] {
	const templateMap = new Map(templates.map((t) => [t.id, t]));
	const lastTrained = new Map<MuscleGroup, number>();

	for (const w of workouts) {
		const t = new Date(w.start_time).getTime();
		for (const ex of w.exercises) {
			const template = templateMap.get(ex.exercise_template_id);
			if (!template) continue;
			const hasWorking = ex.sets.some(
				(s) => s.type === "normal" || s.type === "failure",
			);
			if (!hasWorking) continue;
			const muscles: MuscleGroup[] = [
				template.primary_muscle_group,
				...template.secondary_muscle_groups,
			];
			for (const m of muscles) {
				const prev = lastTrained.get(m) ?? 0;
				if (t > prev) lastTrained.set(m, t);
			}
		}
	}

	const asOfMs = asOf.getTime();
	const keys = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

	return keys
		.map((muscle) => {
			const last = lastTrained.get(muscle);
			if (last == null) {
				return {
					muscle,
					label: MUSCLE_LABELS[muscle],
					days: Number.POSITIVE_INFINITY,
					lastDate: null,
				};
			}
			const days = Math.floor((asOfMs - last) / (24 * 60 * 60 * 1000));
			return {
				muscle,
				label: MUSCLE_LABELS[muscle],
				days,
				lastDate: new Date(last).toISOString().slice(0, 10),
			};
		})
		.sort((a, b) => b.days - a.days);
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

// --- Plateaus ---

export interface PlateauedExercise {
	templateId: string;
	title: string;
	currentBestE1rm: number;
	staleSince: string;
	weeksStale: number;
}

export function plateauedExercises(
	workouts: Workout[],
	templates: ExerciseTemplate[],
	opts: { weeksThreshold?: number; minSets?: number } = {},
): PlateauedExercise[] {
	const weeksThreshold = opts.weeksThreshold ?? 4;
	const minSets = opts.minSets ?? 20;

	const weightTemplates = new Set(
		templates.filter((t) => t.type === "weight_reps").map((t) => t.id),
	);
	const templateMap = new Map(templates.map((t) => [t.id, t]));

	const sorted = [...workouts].sort(
		(a, b) =>
			new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
	);

	const stats = new Map<
		string,
		{ setCount: number; bestE1rm: number; bestDate: string }
	>();

	for (const w of sorted) {
		for (const ex of w.exercises) {
			if (!weightTemplates.has(ex.exercise_template_id)) continue;
			const entry = stats.get(ex.exercise_template_id) ?? {
				setCount: 0,
				bestE1rm: 0,
				bestDate: w.start_time,
			};
			for (const set of ex.sets) {
				if (set.type !== "normal" && set.type !== "failure") continue;
				if (set.weight_kg == null || set.reps == null) continue;
				if (set.weight_kg <= 0 || set.reps <= 0) continue;
				entry.setCount++;
				const e1rm = estimated1RM(set.weight_kg, set.reps);
				if (e1rm > entry.bestE1rm) {
					entry.bestE1rm = e1rm;
					entry.bestDate = w.start_time;
				}
			}
			stats.set(ex.exercise_template_id, entry);
		}
	}

	const now = Date.now();
	const result: PlateauedExercise[] = [];
	for (const [templateId, s] of stats) {
		if (s.setCount < minSets) continue;
		if (s.bestE1rm <= 0) continue;
		const weeksStale = Math.floor(
			(now - new Date(s.bestDate).getTime()) / (7 * 24 * 60 * 60 * 1000),
		);
		if (weeksStale < weeksThreshold) continue;
		result.push({
			templateId,
			title: templateMap.get(templateId)?.title ?? templateId,
			currentBestE1rm: Math.round(s.bestE1rm * 10) / 10,
			staleSince: s.bestDate.slice(0, 10),
			weeksStale,
		});
	}

	return result.sort((a, b) => b.weeksStale - a.weeksStale);
}

// --- Session insights ---

export interface PreviousSessionDelta {
	templateId: string;
	previousWorkoutId: string | null;
	previousDate: string | null;
	volumeDelta: number;
	topE1rmDelta: number;
	setCountDelta: number;
}

function exerciseStats(ex: { sets: WorkoutSet[] }): {
	volume: number;
	topE1rm: number;
	setCount: number;
} {
	let volume = 0;
	let topE1rm = 0;
	let setCount = 0;
	for (const set of ex.sets) {
		if (set.type !== "normal" && set.type !== "failure") continue;
		setCount++;
		volume += setVolume(set);
		if (
			set.weight_kg != null &&
			set.reps != null &&
			set.weight_kg > 0 &&
			set.reps > 0
		) {
			const e = estimated1RM(set.weight_kg, set.reps);
			if (e > topE1rm) topE1rm = e;
		}
	}
	return { volume, topE1rm, setCount };
}

export function previousSessionDeltas(
	workout: Workout,
	allWorkouts: Workout[],
): PreviousSessionDelta[] {
	const currentTime = new Date(workout.start_time).getTime();
	const priorSorted = allWorkouts
		.filter(
			(w) =>
				w.id !== workout.id && new Date(w.start_time).getTime() < currentTime,
		)
		.sort(
			(a, b) =>
				new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
		);

	return workout.exercises.map((ex) => {
		const current = exerciseStats(ex);
		let prev: Workout | null = null;
		let prevEx: { sets: WorkoutSet[] } | null = null;
		for (const pw of priorSorted) {
			const match = pw.exercises.find(
				(e) => e.exercise_template_id === ex.exercise_template_id,
			);
			if (match) {
				prev = pw;
				prevEx = match;
				break;
			}
		}
		if (!prev || !prevEx) {
			return {
				templateId: ex.exercise_template_id,
				previousWorkoutId: null,
				previousDate: null,
				volumeDelta: 0,
				topE1rmDelta: 0,
				setCountDelta: 0,
			};
		}
		const prevStats = exerciseStats(prevEx);
		return {
			templateId: ex.exercise_template_id,
			previousWorkoutId: prev.id,
			previousDate: prev.start_time.slice(0, 10),
			volumeDelta: Math.round((current.volume - prevStats.volume) * 10) / 10,
			topE1rmDelta: Math.round((current.topE1rm - prevStats.topE1rm) * 10) / 10,
			setCountDelta: current.setCount - prevStats.setCount,
		};
	});
}

export interface SessionMuscleEntry {
	muscle: MuscleGroup;
	label: string;
	sets: number;
}

export function sessionMuscleBreakdown(
	workout: Workout,
	templates: ExerciseTemplate[],
): SessionMuscleEntry[] {
	const templateMap = new Map(templates.map((t) => [t.id, t]));
	const counts = new Map<MuscleGroup, number>();

	for (const ex of workout.exercises) {
		const template = templateMap.get(ex.exercise_template_id);
		if (!template) continue;
		const working = ex.sets.filter(
			(s) => s.type === "normal" || s.type === "failure",
		).length;
		if (working === 0) continue;
		counts.set(
			template.primary_muscle_group,
			(counts.get(template.primary_muscle_group) ?? 0) + working,
		);
		for (const sec of template.secondary_muscle_groups) {
			counts.set(sec, (counts.get(sec) ?? 0) + working * 0.5);
		}
	}

	return [...counts.entries()]
		.map(([muscle, sets]) => ({
			muscle,
			label: MUSCLE_LABELS[muscle] ?? muscle,
			sets: Math.round(sets * 10) / 10,
		}))
		.sort((a, b) => b.sets - a.sets);
}

export interface SessionVsAverage {
	durationPct: number;
	volumePct: number;
	setsPct: number;
	baselineCount: number;
}

export function sessionVsAverage(
	workout: Workout,
	allWorkouts: Workout[],
	opts: { weeks?: number } = {},
): SessionVsAverage | null {
	const weeks = opts.weeks ?? 4;
	const ref = new Date(workout.start_time).getTime();
	const windowStart = ref - weeks * 7 * 24 * 60 * 60 * 1000;

	const baseline = allWorkouts.filter((w) => {
		if (w.id === workout.id) return false;
		const t = new Date(w.start_time).getTime();
		return t >= windowStart && t < ref;
	});

	if (baseline.length === 0) return null;

	const stats = (w: Workout) => {
		let volume = 0;
		let sets = 0;
		for (const ex of w.exercises) {
			for (const s of ex.sets) {
				if (s.type !== "normal" && s.type !== "failure") continue;
				sets++;
				volume += setVolume(s);
			}
		}
		return {
			duration: diffMinutes(w.start_time, w.end_time),
			volume,
			sets,
		};
	};

	const current = stats(workout);
	let dSum = 0;
	let vSum = 0;
	let sSum = 0;
	for (const b of baseline) {
		const s = stats(b);
		dSum += s.duration;
		vSum += s.volume;
		sSum += s.sets;
	}
	const n = baseline.length;
	const dAvg = dSum / n;
	const vAvg = vSum / n;
	const sAvg = sSum / n;

	const pct = (cur: number, avg: number) =>
		avg > 0 ? Math.round(((cur - avg) / avg) * 1000) / 10 : 0;

	return {
		durationPct: pct(current.duration, dAvg),
		volumePct: pct(current.volume, vAvg),
		setsPct: pct(current.sets, sAvg),
		baselineCount: n,
	};
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
