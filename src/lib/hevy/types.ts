// Hevy API response types

export type SetType = "warmup" | "normal" | "failure" | "dropset";

export type MuscleGroup =
	| "abdominals"
	| "shoulders"
	| "biceps"
	| "triceps"
	| "forearms"
	| "quadriceps"
	| "hamstrings"
	| "calves"
	| "glutes"
	| "abductors"
	| "adductors"
	| "lats"
	| "upper_back"
	| "traps"
	| "lower_back"
	| "chest"
	| "cardio"
	| "neck"
	| "full_body"
	| "other";

export type ExerciseType =
	| "weight_reps"
	| "reps_only"
	| "bodyweight_reps"
	| "bodyweight_assisted_reps"
	| "duration"
	| "weight_duration"
	| "distance_duration"
	| "short_distance_weight";

export interface WorkoutSet {
	index: number;
	type: SetType;
	weight_kg: number | null;
	reps: number | null;
	distance_meters: number | null;
	duration_seconds: number | null;
	rpe: number | null;
	custom_metric: number | null;
}

export interface WorkoutExercise {
	index: number;
	title: string;
	notes: string | null;
	exercise_template_id: string;
	supersets_id: number | null;
	sets: WorkoutSet[];
}

export interface Workout {
	id: string;
	title: string;
	routine_id: string | null;
	description: string | null;
	start_time: string;
	end_time: string;
	updated_at: string;
	created_at: string;
	exercises: WorkoutExercise[];
}

export interface ExerciseTemplate {
	id: string;
	title: string;
	type: ExerciseType;
	primary_muscle_group: MuscleGroup;
	secondary_muscle_groups: MuscleGroup[];
	is_custom: boolean;
}

export interface RoutineSet {
	index: number;
	type: SetType;
	weight_kg: number | null;
	reps: number | null;
	rep_range: { start: number; end: number } | null;
	distance_meters: number | null;
	duration_seconds: number | null;
	rpe: number | null;
	custom_metric: number | null;
}

export interface RoutineExercise {
	index: number;
	title: string;
	rest_seconds: string | null;
	notes: string | null;
	exercise_template_id: string;
	supersets_id: number | null;
	sets: RoutineSet[];
}

export interface Routine {
	id: string;
	title: string;
	folder_id: number | null;
	updated_at: string;
	created_at: string;
	exercises: RoutineExercise[];
}

// API response wrappers
export interface PaginatedResponse<T> {
	page: number;
	page_count: number;
	[key: string]: T[] | number;
}

export interface WorkoutsResponse {
	page: number;
	page_count: number;
	workouts: Workout[];
}

export interface ExerciseTemplatesResponse {
	page: number;
	page_count: number;
	exercise_templates: ExerciseTemplate[];
}

export interface RoutinesResponse {
	page: number;
	page_count: number;
	routines: Routine[];
}

export interface WorkoutCountResponse {
	workout_count: number;
}

export interface WorkoutUpdatedEvent {
	type: "updated";
	workout: Workout;
}

export interface WorkoutDeletedEvent {
	type: "deleted";
	id: string;
	deleted_at: string;
}

export type WorkoutEvent = WorkoutUpdatedEvent | WorkoutDeletedEvent;

export interface WorkoutEventsResponse {
	page: number;
	page_count: number;
	events: WorkoutEvent[];
}
