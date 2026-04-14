import { createServerFn } from "@tanstack/react-start";

function getUploadDir() {
	const path = require("node:path");
	const fs = require("node:fs");
	const dir = path.join(process.cwd(), "public", "uploads");
	fs.mkdirSync(dir, { recursive: true });
	return dir;
}

async function saveLocal(fileName: string, buffer: Buffer): Promise<string> {
	const path = require("node:path");
	const fs = require("node:fs");
	const uploadDir = getUploadDir();
	const filePath = path.join(uploadDir, fileName);
	fs.writeFileSync(filePath, buffer);
	return `/uploads/${fileName}`;
}

async function saveR2(fileName: string, buffer: Buffer): Promise<string> {
	// TODO: R2 upload -- falls back to local until Cloudflare deployment
	return saveLocal(fileName, buffer);
}

export const uploadProfileImage = createServerFn({ method: "POST" })
	.inputValidator(
		(input: { userId: string; fileName: string; base64: string }) => input,
	)
	.handler(async ({ data }) => {
		const path = require("node:path");
		const buffer = Buffer.from(data.base64, "base64");
		const ext = path.extname(data.fileName) || ".jpg";
		const safeName = `${data.userId}-${Date.now()}${ext}`;

		const isR2 = process.env.STORAGE_BACKEND === "r2";
		const url = isR2
			? await saveR2(safeName, buffer)
			: await saveLocal(safeName, buffer);

		return { url };
	});
