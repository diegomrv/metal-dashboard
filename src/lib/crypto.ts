const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;

function getEncryptionKey(): string {
	const key = process.env.ENCRYPTION_KEY;
	if (!key) {
		throw new Error("ENCRYPTION_KEY environment variable is not set");
	}
	return key;
}

async function importKey(hexKey: string): Promise<CryptoKey> {
	const keyBytes = new Uint8Array(
		hexKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
	);
	return crypto.subtle.importKey("raw", keyBytes, ALGORITHM, false, [
		"encrypt",
		"decrypt",
	]);
}

function toBase64(buffer: ArrayBuffer): string {
	return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(base64: string): Uint8Array {
	return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Encrypts a string using AES-256-GCM. Returns `iv:ciphertext` in base64. */
export async function encrypt(plaintext: string): Promise<string> {
	const key = await importKey(getEncryptionKey());
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
	const encoded = new TextEncoder().encode(plaintext);

	const ciphertext = await crypto.subtle.encrypt(
		{ name: ALGORITHM, iv },
		key,
		encoded,
	);

	return `${toBase64(iv.buffer)}:${toBase64(ciphertext)}`;
}

/** Decrypts an `iv:ciphertext` string produced by `encrypt`. */
export async function decrypt(encrypted: string): Promise<string> {
	const key = await importKey(getEncryptionKey());
	const [ivBase64, ciphertextBase64] = encrypted.split(":");
	const iv = fromBase64(ivBase64);
	const ciphertext = fromBase64(ciphertextBase64);

	const decrypted = await crypto.subtle.decrypt(
		{ name: ALGORITHM, iv },
		key,
		ciphertext,
	);

	return new TextDecoder().decode(decrypted);
}
