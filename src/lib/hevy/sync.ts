import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "#/db/index";
import {
	hevyApiKeys,
	hevyExerciseTemplates,
	hevyPersonalRecords,
	hevyWorkouts,
} from "#/db/schema";
import { decrypt, encrypt } from "#/lib/crypto";
import {
	fetchAllExerciseTemplates,
	fetchAllWorkouts,
	fetchWorkoutEvents,
} from "./api";
import { computePRsFromWorkouts, findNewPRs } from "./pr";
import type { ExerciseTemplate, Workout } from "./types";

async function getLastSyncAtInternal(userId: string): Promise<string | null> {
	const row = await db
		.select({ lastSyncAt: hevyApiKeys.lastSyncAt })
		.from(hevyApiKeys)
		.where(eq(hevyApiKeys.userId, userId))
		.get();
	return row?.lastSyncAt?.toISOString() ?? null;
}

async function getCurrentPRBests(
	userId: string,
): Promise<Map<string, { e1rm: number; volume: number }>> {
	const rows = await db
		.select()
		.from(hevyPersonalRecords)
		.where(eq(hevyPersonalRecords.userId, userId));

	const bests = new Map<string, { e1rm: number; volume: number }>();
	for (const row of rows) {
		const current = bests.get(row.exerciseTemplateId) ?? {
			e1rm: 0,
			volume: 0,
		};
		if (row.type === "e1rm" && row.value > current.e1rm) {
			current.e1rm = row.value;
		}
		if (row.type === "volume" && row.value > current.volume) {
			current.volume = row.value;
		}
		bests.set(row.exerciseTemplateId, current);
	}
	return bests;
}

async function recomputeAffectedPRs(
	userId: string,
	affectedWorkoutIds: string[],
	templateMap: Map<string, ExerciseTemplate>,
): Promise<Set<string>> {
	const affectedPRs = await db
		.select({ exerciseTemplateId: hevyPersonalRecords.exerciseTemplateId })
		.from(hevyPersonalRecords)
		.where(
			and(
				eq(hevyPersonalRecords.userId, userId),
				inArray(hevyPersonalRecords.workoutId, affectedWorkoutIds),
			),
		);

	if (affectedPRs.length === 0) return new Set();

	const affectedExercises = new Set(
		affectedPRs.map((r) => r.exerciseTemplateId),
	);

	await db
		.delete(hevyPersonalRecords)
		.where(
			and(
				eq(hevyPersonalRecords.userId, userId),
				inArray(hevyPersonalRecords.exerciseTemplateId, [...affectedExercises]),
			),
		);

	const workoutRows = await db
		.select({ rawJson: hevyWorkouts.rawJson })
		.from(hevyWorkouts)
		.where(eq(hevyWorkouts.userId, userId));

	const allWorkouts = workoutRows
		.map((r) => JSON.parse(r.rawJson) as Workout)
		.sort(
			(a, b) =>
				new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
		);

	const filteredWorkouts = allWorkouts
		.map((w) => ({
			...w,
			exercises: w.exercises.filter((ex) =>
				affectedExercises.has(ex.exercise_template_id),
			),
		}))
		.filter((w) => w.exercises.length > 0);

	const prs = computePRsFromWorkouts(filteredWorkouts, templateMap);

	if (prs.length > 0) {
		await db
			.insert(hevyPersonalRecords)
			.values(prs.map((pr) => ({ ...pr, userId })));
	}

	return affectedExercises;
}

export const saveApiKey = createServerFn({ method: "POST" })
	.inputValidator((input: { userId: string; apiKey: string }) => input)
	.handler(async ({ data }) => {
		const encryptedKey = await encrypt(data.apiKey);
		const existing = await db
			.select()
			.from(hevyApiKeys)
			.where(eq(hevyApiKeys.userId, data.userId))
			.get();

		if (existing) {
			await db
				.update(hevyApiKeys)
				.set({ apiKey: encryptedKey })
				.where(eq(hevyApiKeys.userId, data.userId));
		} else {
			await db.insert(hevyApiKeys).values({
				userId: data.userId,
				apiKey: encryptedKey,
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
		if (!row?.apiKey) return null;
		return decrypt(row.apiKey);
	});

export const syncHevyData = createServerFn({ method: "POST" })
	.inputValidator((input: { userId: string; apiKey: string }) => input)
	.handler(async ({ data }) => {
		const lastSyncAt = await getLastSyncAtInternal(data.userId);

		const templates = await fetchAllExerciseTemplates({
			data: { apiKey: data.apiKey },
		});
		await db
			.delete(hevyExerciseTemplates)
			.where(eq(hevyExerciseTemplates.userId, data.userId));
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

		const templateMap = new Map(templates.map((t) => [t.id, t]));

		if (lastSyncAt) {
			const events = await fetchWorkoutEvents({
				data: { apiKey: data.apiKey, since: lastSyncAt },
			});

			const updatedWorkouts: Workout[] = [];
			const deletedIds: string[] = [];
			const updatedIds: string[] = [];

			for (const event of events) {
				if (event.type === "updated") {
					updatedWorkouts.push(event.workout);
					updatedIds.push(event.workout.id);
					await db
						.insert(hevyWorkouts)
						.values({
							userId: data.userId,
							hevyId: event.workout.id,
							title: event.workout.title,
							startTime: event.workout.start_time,
							endTime: event.workout.end_time,
							rawJson: JSON.stringify(event.workout),
						})
						.onConflictDoUpdate({
							target: [hevyWorkouts.userId, hevyWorkouts.hevyId],
							set: {
								title: event.workout.title,
								startTime: event.workout.start_time,
								endTime: event.workout.end_time,
								rawJson: JSON.stringify(event.workout),
							},
						});
				} else {
					deletedIds.push(event.id);
					await db
						.delete(hevyWorkouts)
						.where(
							and(
								eq(hevyWorkouts.userId, data.userId),
								eq(hevyWorkouts.hevyId, event.id),
							),
						);
				}
			}

			const affectedIds = [...deletedIds, ...updatedIds];
			let recomputedExercises = new Set<string>();
			if (affectedIds.length > 0) {
				recomputedExercises = await recomputeAffectedPRs(
					data.userId,
					affectedIds,
					templateMap,
				);
			}

			if (updatedWorkouts.length > 0) {
				const workoutsToCheck = updatedWorkouts
					.map((w) => ({
						...w,
						exercises: w.exercises.filter(
							(ex) => !recomputedExercises.has(ex.exercise_template_id),
						),
					}))
					.filter((w) => w.exercises.length > 0);

				if (workoutsToCheck.length > 0) {
					const currentBests = await getCurrentPRBests(data.userId);
					const newPRs = findNewPRs(workoutsToCheck, templateMap, currentBests);
					if (newPRs.length > 0) {
						await db
							.insert(hevyPersonalRecords)
							.values(newPRs.map((pr) => ({ ...pr, userId: data.userId })));
					}
				}
			}
		} else {
			const workouts = await fetchAllWorkouts({
				data: { apiKey: data.apiKey },
			});

			await db.delete(hevyWorkouts).where(eq(hevyWorkouts.userId, data.userId));
			await db
				.delete(hevyPersonalRecords)
				.where(eq(hevyPersonalRecords.userId, data.userId));

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

			const sorted = [...workouts].sort(
				(a, b) =>
					new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
			);
			const prs = computePRsFromWorkouts(sorted, templateMap);
			if (prs.length > 0) {
				await db
					.insert(hevyPersonalRecords)
					.values(prs.map((pr) => ({ ...pr, userId: data.userId })));
			}
		}

		await db
			.update(hevyApiKeys)
			.set({ lastSyncAt: new Date() })
			.where(eq(hevyApiKeys.userId, data.userId));

		const workoutCount = await db
			.select({ id: hevyWorkouts.id })
			.from(hevyWorkouts)
			.where(eq(hevyWorkouts.userId, data.userId));

		return { workouts: workoutCount.length, templates: templates.length };
	});

export const getLastSyncAt = createServerFn({ method: "GET" })
	.inputValidator((input: { userId: string }) => input)
	.handler(async ({ data }) => {
		return getLastSyncAtInternal(data.userId);
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

export const getRecentPRs = createServerFn({ method: "GET" })
	.inputValidator((input: { userId: string; limit?: number }) => input)
	.handler(async ({ data }) => {
		const limit = data.limit ?? 5;
		return db
			.select()
			.from(hevyPersonalRecords)
			.where(eq(hevyPersonalRecords.userId, data.userId))
			.orderBy(
				desc(hevyPersonalRecords.achievedAt),
				desc(hevyPersonalRecords.id),
			)
			.limit(limit);
	});
