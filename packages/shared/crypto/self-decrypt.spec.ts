import { describe, expect, it } from 'vitest';
import { decryptMessage, encryptMessage, generateIdentity } from './secure-messaging';

describe('own message rendering', () => {
	it('decrypts an outgoing envelope with the sender bundle', async () => {
		const alice = await generateIdentity();
		const bob = await generateIdentity();
		const envelope = await encryptMessage(alice, 'alice', 'bob', bob.bundle, 'Моё сообщение');
		const plain = await decryptMessage(alice, alice.bundle, envelope, bob.bundle);

		expect(plain).toBe('Моё сообщение');
	});
});
