import { describe, expect, it } from 'vitest';
import { decryptMessage, encryptMessage, generateIdentity } from './secure-messaging';

describe('secure messaging', () => {
	it('round-trips an encrypted message', async () => {
		const alice = await generateIdentity();
		const bob = await generateIdentity();
		const envelope = await encryptMessage(alice, 'alice', 'bob', bob.bundle, 'Привет, стример!');
		const plain = await decryptMessage(bob, alice.bundle, envelope);

		expect(plain).toBe('Привет, стример!');
		expect(envelope.ciphertext).not.toContain('Привет');
	});

	it('rejects a forged envelope', async () => {
		const alice = await generateIdentity();
		const bob = await generateIdentity();
		const envelope = await encryptMessage(alice, 'alice', 'bob', bob.bundle, 'secret');
		const tampered = { ...envelope, ciphertext: `${envelope.ciphertext.slice(0, -4)}AAAA` };
		const bobOnly = await generateIdentity();
		await expect(decryptMessage(bobOnly, alice.bundle, tampered)).rejects.toThrow();
	});
});
