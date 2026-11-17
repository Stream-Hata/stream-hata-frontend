import { describe, expect, it } from 'vitest';
import { decryptRecovery, encryptRecovery } from './recovery';
import { generateIdentity } from './secure-messaging';

describe('identity recovery', () => {
	it('round-trips identity with the correct password', async () => {
		const identity = await generateIdentity();
		const blob = await encryptRecovery(identity, 'correct horse battery staple');
		const restored = await decryptRecovery(blob, 'correct horse battery staple');

		expect(restored.bundle.keyId).toBe(identity.bundle.keyId);
		expect(restored.encryptionPrivateKey).toEqual(identity.encryptionPrivateKey);
	});

	it('rejects a wrong password', async () => {
		const identity = await generateIdentity();
		const blob = await encryptRecovery(identity, 'right-password');

		await expect(decryptRecovery(blob, 'wrong-password')).rejects.toThrow();
	});
});
