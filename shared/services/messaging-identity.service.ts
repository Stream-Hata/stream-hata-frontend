import type { Identity } from '../crypto/secure-messaging';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { generateIdentity } from '../crypto/secure-messaging';

type Invoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;
const STORAGE_KEY = 'nsh.messaging-identity';

@Injectable({ providedIn: 'root' })
export class MessagingIdentityService {
	private readonly http = inject(HttpClient);
	private readonly invoke = (
		window as unknown as { __TAURI_INTERNALS__?: { invoke?: Invoke } }
	).__TAURI_INTERNALS__?.invoke;
	private cached: Identity | null = null;

	async ensure(): Promise<Identity | null> {
		if (this.cached) {
			return this.cached;
		}
		if (!this.invoke) {
			return null;
		}
		const stored = (await this.invoke('load_messaging_identity')) as string | null;
		if (stored) {
			try {
				this.cached = JSON.parse(stored) as Identity;
			} catch {
				this.cached = null;
			}
		}
		if (!this.cached) {
			this.cached = await generateIdentity();
			await this.invoke('save_messaging_identity', {
				value: JSON.stringify(this.cached),
			});
		}
		await this.http
			.put('rgg-sync/messaging/identity', this.cached.bundle)
			.toPromise()
			.catch(() => undefined);

		return this.cached;
	}

	async save(identity: Identity): Promise<void> {
		this.cached = identity;
		await this.invoke?.('save_messaging_identity', { value: JSON.stringify(identity) });
		await this.http.put('rgg-sync/messaging/identity', identity.bundle).toPromise().catch(() => undefined);
	}

	async clear(): Promise<void> {
		this.cached = null;
		await this.invoke?.('clear_messaging_identity');
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {
			// storage unavailable
		}
	}
}
