import { env as cloudflareEnv } from "cloudflare:workers";

export function isCloudflareRuntime(): boolean {
	return typeof WebSocketPair !== "undefined";
}

export function getServerEnv(name: string): string | undefined {
	if (isCloudflareRuntime()) {
		return cloudflareEnv[name as keyof typeof cloudflareEnv] as
			| string
			| undefined;
	}

	return process.env[name];
}

export function getStorageBackend(): "local" | "r2" {
	const value = getServerEnv("STORAGE_BACKEND");
	return value === "r2" ? "r2" : "local";
}

export function getCloudflareD1Binding(): D1Database | undefined {
	return cloudflareEnv.DB;
}
