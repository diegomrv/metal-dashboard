import { sql } from "drizzle-orm";
import {
	integer,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

export * from "./auth-schema";

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
	prLogicVersion: integer("pr_logic_version").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp" }).default(
		sql`(unixepoch())`,
	),
});

export const hevyWorkouts = sqliteTable(
	"hevy_workouts",
	{
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
	},
	(table) => [
		uniqueIndex("hevy_workouts_user_hevy_idx").on(table.userId, table.hevyId),
	],
);

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

export const hevyPersonalRecords = sqliteTable("hevy_personal_records", {
	id: integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
	userId: text("user_id").notNull(),
	exerciseTemplateId: text("exercise_template_id").notNull(),
	exerciseTitle: text("exercise_title").notNull(),
	type: text({ enum: ["e1rm", "volume"] }).notNull(),
	value: real().notNull(),
	weightKg: real("weight_kg").notNull(),
	reps: integer().notNull(),
	workoutId: text("workout_id").notNull(),
	achievedAt: text("achieved_at").notNull(),
	previousValue: real("previous_value"),
});
