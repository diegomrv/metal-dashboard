import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";
import { db } from "#/db/index";
import { hevyApiKeys, hevyExerciseTemplates, hevyWorkouts } from "#/db/schema";

export const auth = betterAuth({
	emailAndPassword: {
		enabled: true,
	},
	user: {
		deleteUser: {
			enabled: true,
			beforeDelete: async (user) => {
				// Anonymize workout data -- set userId to null
				await db
					.update(hevyWorkouts)
					.set({ userId: null })
					.where(eq(hevyWorkouts.userId, user.id));
				await db
					.update(hevyExerciseTemplates)
					.set({ userId: null })
					.where(eq(hevyExerciseTemplates.userId, user.id));
				// Delete API key (no need to keep it)
				await db.delete(hevyApiKeys).where(eq(hevyApiKeys.userId, user.id));
			},
		},
		changePassword: {
			enabled: true,
		},
	},
	plugins: [tanstackStartCookies()],
});
