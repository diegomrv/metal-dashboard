import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db } from "#/db/index";
import { hevyApiKeys, hevyExerciseTemplates, hevyWorkouts } from "#/db/schema";
import { fetchAllExerciseTemplates, fetchAllWorkouts } from "./api";
import type { ExerciseTemplate, Workout } from "./types";

export const saveApiKey = createServerFn({ method: "POST" })
	.inputValidator((input: { userId: string; apiKey: string }) => input)
	.handler(async ({ data }) => {
		const existing = await db
			.select()
			.from(hevyApiKeys)
			.where(eq(hevyApiKeys.userId, data.userId))
			.get();

		if (existing) {
			await db
				.update(hevyApiKeys)
				.set({ apiKey: data.apiKey })
				.where(eq(hevyApiKeys.userId, data.userId));
		} else {
			await db.insert(hevyApiKeys).values({
				userId: data.userId,
				apiKey: data.apiKey,
			});
		}
	});

export const getApiKey = createServerFn({ method: "GET" })
	.inputValidator((input: { userId: string }) => input)
	.handler(async ({ data }) => {
		const row = await db
			.select()
			.from(hevyApiKeys)
			.where(eq(hevyApiKeys.userId, data.userId))
			.get();
		return row?.apiKey ?? null;
	});

export const syncHevyData = createServerFn({ method: "POST" })
	.inputValidator((input: { userId: string; apiKey: string }) => input)
	.handler(async ({ data }) => {
		const [workouts, templates] = await Promise.all([
			fetchAllWorkouts({ data: { apiKey: data.apiKey } }),
			fetchAllExerciseTemplates({ data: { apiKey: data.apiKey } }),
		]);

		// Clear existing data for this user
		await db.delete(hevyWorkouts).where(eq(hevyWorkouts.userId, data.userId));
		await db
			.delete(hevyExerciseTemplates)
			.where(eq(hevyExerciseTemplates.userId, data.userId));

		// Insert workouts
		if (workouts.length > 0) {
			await db.insert(hevyWorkouts).values(
				workouts.map((w: Workout) => ({
					userId: data.userId,
					hevyId: w.id,
					title: w.title,
					startTime: w.start_time,
					endTime: w.end_time,
					rawJson: JSON.stringify(w),
				})),
			);
		}

		// Insert templates
		if (templates.length > 0) {
			await db.insert(hevyExerciseTemplates).values(
				templates.map((t: ExerciseTemplate) => ({
					userId: data.userId,
					hevyId: t.id,
					title: t.title,
					type: t.type,
					primaryMuscle: t.primary_muscle_group,
					rawJson: JSON.stringify(t),
				})),
			);
		}

		// Update last sync timestamp
		await db
			.update(hevyApiKeys)
			.set({ lastSyncAt: new Date() })
			.where(eq(hevyApiKeys.userId, data.userId));

		return { workouts: workouts.length, templates: templates.length };
	});

export const getStoredData = createServerFn({ method: "GET" })
	.inputValidator((input: { userId: string }) => input)
	.handler(async ({ data }) => {
		const [workoutRows, templateRows, keyRow] = await Promise.all([
			db
				.select()
				.from(hevyWorkouts)
				.where(eq(hevyWorkouts.userId, data.userId)),
			db
				.select()
				.from(hevyExerciseTemplates)
				.where(eq(hevyExerciseTemplates.userId, data.userId)),
			db
				.select()
				.from(hevyApiKeys)
				.where(eq(hevyApiKeys.userId, data.userId))
				.get(),
		]);

		const workouts: Workout[] = workoutRows.map(
			(r) => JSON.parse(r.rawJson) as Workout,
		);
		const templates: ExerciseTemplate[] = templateRows.map(
			(r) => JSON.parse(r.rawJson) as ExerciseTemplate,
		);

		return {
			workouts,
			templates,
			lastSyncAt: keyRow?.lastSyncAt?.toISOString() ?? null,
		};
	});
