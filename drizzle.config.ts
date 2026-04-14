import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: [".env.local", ".env"] });

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.CLOUDFLARE_DATABASE_ID;
const token = process.env.CLOUDFLARE_D1_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;
const localUrl = process.env.DATABASE_URL;

const drizzleConfig = localUrl
	? defineConfig({
		out: "./drizzle",
		schema: "./src/db/schema.ts",
		dialect: "sqlite",
		dbCredentials: { url: localUrl },
	})
	: (() => {
			if (!accountId) {
				throw new Error("CLOUDFLARE_ACCOUNT_ID environment variable is not set");
			}

			if (!databaseId) {
				throw new Error("CLOUDFLARE_DATABASE_ID environment variable is not set");
			}

			if (!token) {
				throw new Error(
					"CLOUDFLARE_D1_TOKEN or CLOUDFLARE_API_TOKEN environment variable is not set",
				);
			}

			return defineConfig({
				out: "./drizzle",
				schema: "./src/db/schema.ts",
				dialect: "sqlite",
				driver: "d1-http",
				dbCredentials: {
					accountId,
					databaseId,
					token,
				},
			});
		})();

export default drizzleConfig;
