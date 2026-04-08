import * as fs from "node:fs";
import * as path from "node:path";
import { createServerFn } from "@tanstack/react-start";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

function ensureUploadDir() {
	if (!fs.existsSync(UPLOAD_DIR)) {
		fs.mkdirSync(UPLOAD_DIR, { recursive: true });
	}
}

async function saveLocal(fileName: string, buffer: Buffer): Promise<string> {
	ensureUploadDir();
	const filePath = path.join(UPLOAD_DIR, fileName);
	fs.writeFileSync(filePath, buffer);
	return `/uploads/${fileName}`;
}

async function saveR2(fileName: string, buffer: Buffer): Promise<string> {
	// R2 implementation will be added when deploying to Cloudflare
	// For now, fall back to local
	return saveLocal(fileName, buffer);
}

function isR2() {
	return process.env.STORAGE_BACKEND === "r2";
}

export const uploadProfileImage = createServerFn({ method: "POST" })
	.inputValidator(
		(input: { userId: string; fileName: string; base64: string }) => input,
	)
	.handler(async ({ data }) => {
		const buffer = Buffer.from(data.base64, "base64");
		const ext = path.extname(data.fileName) || ".jpg";
		const safeName = `${data.userId}-${Date.now()}${ext}`;

		const url = isR2()
			? await saveR2(safeName, buffer)
			: await saveLocal(safeName, buffer);

		return { url };
	});
