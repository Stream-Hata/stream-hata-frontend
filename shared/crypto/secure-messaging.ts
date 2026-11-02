export interface PublicKeyBundle {
	algorithm: 'ECDH-P256+ECDSA-P256';
	keyId: string;
	encryptionKey: JsonWebKey;
	signingKey: JsonWebKey;
}

export interface Identity {
	encryptionPrivateKey: JsonWebKey;
	encryptionPublicKey: JsonWebKey;
	signingPrivateKey: JsonWebKey;
	signingPublicKey: JsonWebKey;
	bundle: PublicKeyBundle;
}

export interface SecureEnvelope {
	version: 1;
	algorithm: 'ECDH-P256+HKDF-SHA256+AES-256-GCM';
	sender: string;
	recipient: string;
	keyId: string;
	nonce: string;
	ciphertext: string;
	signature: string;
}

const ALGORITHM = 'ECDH-P256+HKDF-SHA256+AES-256-GCM' as const;
const HKDF_SALT = 'streamhata-messaging-v1';

export async function generateIdentity(): Promise<Identity> {
	const encryption = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
		'deriveBits',
	]);
	const signing = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
		'sign',
		'verify',
	]);
	const encryptionPublicKey = await crypto.subtle.exportKey('jwk', encryption.publicKey);
	const signingPublicKey = await crypto.subtle.exportKey('jwk', signing.publicKey);
	const keyId = await fingerprint(encryptionPublicKey, signingPublicKey);

	return {
		encryptionPrivateKey: await crypto.subtle.exportKey('jwk', encryption.privateKey),
		encryptionPublicKey,
		signingPrivateKey: await crypto.subtle.exportKey('jwk', signing.privateKey),
		signingPublicKey,
		bundle: {
			algorithm: 'ECDH-P256+ECDSA-P256',
			keyId,
			encryptionKey: encryptionPublicKey,
			signingKey: signingPublicKey,
		},
	};
}

export async function encryptMessage(
	sender: Identity,
	senderLogin: string,
	recipientLogin: string,
	recipient: PublicKeyBundle,
	text: string,
): Promise<SecureEnvelope> {
	const privateKey = await crypto.subtle.importKey(
		'jwk',
		sender.encryptionPrivateKey,
		{ name: 'ECDH', namedCurve: 'P-256' },
		false,
		['deriveBits'],
	);
	const publicKey = await crypto.subtle.importKey(
		'jwk',
		recipient.encryptionKey,
		{ name: 'ECDH', namedCurve: 'P-256' },
		false,
		[],
	);
	const shared = await crypto.subtle.deriveBits(
		{ name: 'ECDH', public: publicKey },
		privateKey,
		256,
	);
	const aesKey = await deriveAesKey(shared, senderLogin, recipientLogin);
	const nonce = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv: nonce },
		aesKey,
		new TextEncoder().encode(text),
	);
	const unsigned = {
		version: 1 as const,
		algorithm: ALGORITHM,
		sender: senderLogin,
		recipient: recipientLogin,
		keyId: sender.bundle.keyId,
		nonce: toBase64(nonce),
		ciphertext: toBase64(new Uint8Array(ciphertext)),
	};
	const signature = await signPayload(sender, unsigned);

	return { ...unsigned, signature };
}

export async function decryptMessage(
	identity: Identity,
	sender: PublicKeyBundle,
	envelope: SecureEnvelope,
): Promise<string> {
	const valid = await verifyPayload(sender, envelope);
	if (!valid) {
		throw new Error('Подпись сообщения недействительна');
	}
	const privateKey = await crypto.subtle.importKey(
		'jwk',
		identity.encryptionPrivateKey,
		{ name: 'ECDH', namedCurve: 'P-256' },
		false,
		['deriveBits'],
	);
	const publicKey = await crypto.subtle.importKey(
		'jwk',
		sender.encryptionKey,
		{ name: 'ECDH', namedCurve: 'P-256' },
		false,
		[],
	);
	const shared = await crypto.subtle.deriveBits(
		{ name: 'ECDH', public: publicKey },
		privateKey,
		256,
	);
	const aesKey = await deriveAesKey(shared, envelope.sender, envelope.recipient);
	const plain = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: fromBase64(envelope.nonce) },
		aesKey,
		fromBase64(envelope.ciphertext),
	);

	return new TextDecoder().decode(plain);
}

async function deriveAesKey(
	shared: ArrayBuffer,
	sender: string,
	recipient: string,
): Promise<CryptoKey> {
	const hkdf = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
	const info = new TextEncoder().encode(`${sender}\u0000${recipient}`);

	return crypto.subtle.deriveKey(
		{
			name: 'HKDF',
			hash: 'SHA-256',
			salt: new TextEncoder().encode(HKDF_SALT),
			info,
		},
		hkdf,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt', 'decrypt'],
	);
}

async function signPayload(identity: Identity, payload: Record<string, unknown>): Promise<string> {
	const key = await crypto.subtle.importKey(
		'jwk',
		identity.signingPrivateKey,
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['sign'],
	);
	const signature = await crypto.subtle.sign(
		{ name: 'ECDSA', hash: 'SHA-256' },
		key,
		new TextEncoder().encode(stableJson(payload)),
	);

	return toBase64(new Uint8Array(signature));
}

async function verifyPayload(bundle: PublicKeyBundle, envelope: SecureEnvelope): Promise<boolean> {
	const key = await crypto.subtle.importKey(
		'jwk',
		bundle.signingKey,
		{ name: 'ECDSA', namedCurve: 'P-256' },
		false,
		['verify'],
	);
	const { signature, ...payload } = envelope;

	return crypto.subtle.verify(
		{ name: 'ECDSA', hash: 'SHA-256' },
		key,
		fromBase64(signature),
		new TextEncoder().encode(stableJson(payload)),
	);
}

async function fingerprint(...keys: JsonWebKey[]): Promise<string> {
	const digest = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(keys.map((key) => JSON.stringify(key)).join('|')),
	);

	return toBase64(new Uint8Array(digest))
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replaceAll('=', '');
}

function stableJson(value: unknown): string {
	return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
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

export interface MessageNotification {
	title: string;
	body: string;
}

/** Notification text is built only from locally decrypted plaintext. */
export function buildMessageNotification(sender: string, plaintext: string): MessageNotification {
	const text = plaintext.replace(/\s+/g, ' ').trim();

	return {
		title: sender ? `Сообщение от ${sender}` : 'Новое сообщение',
		body: text ? text.slice(0, 180) : 'Откройте StreamHata, чтобы прочитать сообщение.',
	};
}

/** Safe fallback when decryption is unavailable; never exposes ciphertext or key ids. */
export function buildLockedMessageNotification(sender?: string): MessageNotification {
	return {
		title: sender ? `Новое сообщение от ${sender}` : 'Новое зашифрованное сообщение',
		body: 'Откройте StreamHata, чтобы прочитать сообщение.',
	};
}
