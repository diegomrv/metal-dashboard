import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const todos = sqliteTable("todos", {
	id: integer({ mode: "number" }).primaryKey({
		autoIncrement: true,
	}),
	title: text().notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).default(
		sql`(unixepoch())`,
	),
});

export const hevyApiKeys = sqliteTable("hevy_api_keys", {
	id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
	userId: text("user_id").notNull().unique(),
	apiKey: text("api_key").notNull(),
	lastSyncAt: integer("last_sync_at", { mode: "timestamp" }),
	createdAt: integer("created_at", { mode: "timestamp" }).default(
		sql`(unixepoch())`,
	),
});

export const hevyWorkouts = sqliteTable("hevy_workouts", {
	id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
	userId: text("user_id"),
	hevyId: text("hevy_id").notNull(),
	title: text().notNull(),
	startTime: text("start_time").notNull(),
	endTime: text("end_time").notNull(),
	rawJson: text("raw_json").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).default(
		sql`(unixepoch())`,
	),
});

export const hevyExerciseTemplates = sqliteTable("hevy_exercise_templates", {
	id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
	userId: text("user_id"),
	hevyId: text("hevy_id").notNull(),
	title: text().notNull(),
	type: text().notNull(),
	primaryMuscle: text("primary_muscle").notNull(),
	rawJson: text("raw_json").notNull(),
	createdAt: integer("created_at", { mode: "timestamp" }).default(
		sql`(unixepoch())`,
	),
});
