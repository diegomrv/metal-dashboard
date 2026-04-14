import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";

import { getCloudflareD1Binding, isCloudflareRuntime } from "#/lib/runtime-env";
import * as schema from "./schema.ts";

const db = (() => {
	if (isCloudflareRuntime()) {
		const binding = getCloudflareD1Binding();
		if (!binding) {
			throw new Error("Cloudflare D1 binding `DB` is not configured");
		}

		return drizzleD1(binding, { schema });
	}

	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error("DATABASE_URL environment variable is not set");
	}

	return drizzleSqlite(url, { schema });
})();

export { db };
