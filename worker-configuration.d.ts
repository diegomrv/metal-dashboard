declare module "cloudflare:workers" {
	interface Env {
		DB: D1Database;
		BETTER_AUTH_SECRET: string;
		BETTER_AUTH_URL: string;
		ENCRYPTION_KEY: string;
		STORAGE_BACKEND?: "local" | "r2";
		VITE_POSTHOG_KEY?: string;
		VITE_POSTHOG_HOST?: string;
	}

	export const env: Env;
}

interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T = unknown>(columnName?: string): Promise<T | null>;
	run<T = unknown>(): Promise<T>;
	all<T = unknown>(): Promise<{ results: T[] }>;
	raw<T = unknown>(): Promise<T[]>;
}

interface D1Database {
	prepare(query: string): D1PreparedStatement;
	batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
	exec(query: string): Promise<unknown>;
}
