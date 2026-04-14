import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";
import { db } from "#/db/index";
import { hevyApiKeys, hevyExerciseTemplates, hevyWorkouts } from "#/db/schema";

export const auth = betterAuth({
	database: drizzleAdapter(db, { provider: "sqlite" }),
	emailAndPassword: {
		enabled: true,
	},
	user: {
		deleteUser: {
			enabled: true,
			beforeDelete: async (user) => {
				await Promise.all([
					db
						.update(hevyWorkouts)
						.set({ userId: null })
						.where(eq(hevyWorkouts.userId, user.id)),
					db
						.update(hevyExerciseTemplates)
						.set({ userId: null })
						.where(eq(hevyExerciseTemplates.userId, user.id)),
					db.delete(hevyApiKeys).where(eq(hevyApiKeys.userId, user.id)),
				]);
			},
		},
		changePassword: {
			enabled: true,
		},
	},
	plugins: [tanstackStartCookies()],
});
