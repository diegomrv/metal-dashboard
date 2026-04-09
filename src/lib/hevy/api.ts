import { createServerFn } from "@tanstack/react-start";
import type {
	ExerciseTemplate,
	Routine,
	Workout,
	WorkoutCountResponse,
	WorkoutEvent,
	WorkoutEventsResponse,
} from "./types";

const HEVY_BASE_URL = "https://api.hevyapp.com";

async function hevyFetch<T>(
	path: string,
	apiKey: string,
	params?: Record<string, string>,
): Promise<T> {
	const url = new URL(`${HEVY_BASE_URL}${path}`);
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value);
		}
	}

	const res = await fetch(url.toString(), {
		headers: { "api-key": apiKey },
	});

	if (!res.ok) {
		throw new Error(`Hevy API error: ${res.status} ${res.statusText}`);
	}

	return res.json() as Promise<T>;
}

async function fetchAllPages<T>(
	path: string,
	apiKey: string,
	key: string,
	maxPageSize: number,
): Promise<T[]> {
	const all: T[] = [];
	let page = 1;

	while (true) {
		const res = await hevyFetch<
			{ page: number; page_count: number } & Record<string, T[]>
		>(path, apiKey, { page: String(page), pageSize: String(maxPageSize) });

		const items = res[key];
		if (Array.isArray(items)) {
			all.push(...items);
		}

		if (page >= res.page_count) break;
		page++;
	}

	return all;
}

export const fetchWorkoutCount = createServerFn({ method: "GET" })
	.inputValidator((input: { apiKey: string }) => input)
	.handler(async ({ data }) => {
		const res = await hevyFetch<WorkoutCountResponse>(
			"/v1/workouts/count",
			data.apiKey,
		);
		return res.workout_count;
	});

export const fetchAllWorkouts = createServerFn({ method: "GET" })
	.inputValidator((input: { apiKey: string }) => input)
	.handler(async ({ data }) => {
		return fetchAllPages<Workout>("/v1/workouts", data.apiKey, "workouts", 10);
	});

export const fetchAllExerciseTemplates = createServerFn({ method: "GET" })
	.inputValidator((input: { apiKey: string }) => input)
	.handler(async ({ data }) => {
		return fetchAllPages<ExerciseTemplate>(
			"/v1/exercise_templates",
			data.apiKey,
			"exercise_templates",
			100,
		);
	});

export const fetchAllRoutines = createServerFn({ method: "GET" })
	.inputValidator((input: { apiKey: string }) => input)
	.handler(async ({ data }) => {
		return fetchAllPages<Routine>("/v1/routines", data.apiKey, "routines", 10);
	});

export const fetchWorkoutEvents = createServerFn({ method: "GET" })
	.inputValidator((input: { apiKey: string; since: string }) => input)
	.handler(async ({ data }) => {
		const all: WorkoutEvent[] = [];
		let page = 1;

		while (true) {
			const res = await hevyFetch<WorkoutEventsResponse>(
				"/v1/workouts/events",
				data.apiKey,
				{ page: String(page), pageSize: "10", since: data.since },
			);

			all.push(...res.events);

			if (page >= res.page_count) break;
			page++;
		}

		return all;
	});
