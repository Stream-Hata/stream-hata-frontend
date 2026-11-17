import type { Identity } from './secure-messaging';

export interface RecoveryBlob {
	version: 1;
	salt: string;
	iv: string;
	ciphertext: string;
}

const ITERATIONS = 310_000;

export async function encryptRecovery(identity: Identity, password: string): Promise<RecoveryBlob> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const key = await deriveKey(password, salt);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		new TextEncoder().encode(JSON.stringify(identity)),
	);

	return {
		version: 1,
		salt: toBase64(salt),
		iv: toBase64(iv),
		ciphertext: toBase64(new Uint8Array(ciphertext)),
	};
}

export async function decryptRecovery(blob: RecoveryBlob, password: string): Promise<Identity> {
	const plain = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: fromBase64(blob.iv) as BufferSource },
		await deriveKey(password, fromBase64(blob.salt)),
		fromBase64(blob.ciphertext) as BufferSource,
	);

	return JSON.parse(new TextDecoder().decode(plain)) as Identity;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
	const material = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveKey'],
	);

	return crypto.subtle.deriveKey(
		{ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITERATIONS },
		material,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt'],
	);
}

function toBase64(bytes: Uint8Array): string {
	let binary = '';

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
	return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
