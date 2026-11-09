import { computed, Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'nsh.app-lock';

interface LockState {
	enabled: boolean;
	hash: string;
	timeoutMinutes: number;
}

@Injectable({ providedIn: 'root' })
export class AppLockService {
	readonly enabled = signal(false);
	readonly locked = signal(false);
	readonly timeoutMinutes = signal(5);
	private hash = '';
	private lastActivity = Date.now();

	constructor() {
		try {
			const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<LockState>;
			this.enabled.set(Boolean(parsed.enabled && parsed.hash));
			this.hash = parsed.hash ?? '';
			this.timeoutMinutes.set(parsed.timeoutMinutes ?? 5);
			this.locked.set(this.enabled());
		} catch {
			// ignore broken storage
		}
	}

	readonly configured = computed(() => this.enabled() && Boolean(this.hash));

	async setPin(pin: string): Promise<boolean> {
		const normalized = pin.trim();

		if (normalized.length < 4) {
			return false;
		}
		this.hash = await digest(normalized);
		this.enabled.set(true);
		this.locked.set(false);
		this.lastActivity = Date.now();
		this.persist();

		return true;
	}

	async unlock(pin: string): Promise<boolean> {
		if (!this.enabled() || !this.hash) {
			return true;
		}
		const valid = (await digest(pin.trim())) === this.hash;

		if (valid) {
			this.locked.set(false);
			this.lastActivity = Date.now();
		}

		return valid;
	}

	disable(): void {
		this.enabled.set(false);
		this.locked.set(false);
		this.hash = '';
		this.persist();
	}

	lockNow(): void {
		if (this.enabled()) {
			this.locked.set(true);
		}
	}

	touch(): void {
		this.lastActivity = Date.now();
	}

	checkIdle(): void {
		if (!this.enabled() || this.locked()) {
			return;
		}
		if (Date.now() - this.lastActivity > this.timeoutMinutes() * 60_000) {
			this.locked.set(true);
		}
	}

	setTimeoutMinutes(minutes: number): void {
		this.timeoutMinutes.set(Math.max(1, Math.min(120, Math.round(minutes) || 5)));
		this.persist();
	}

	private persist(): void {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({
					enabled: this.enabled(),
					hash: this.hash,
					timeoutMinutes: this.timeoutMinutes(),
				}),
			);
		} catch {
			// storage unavailable
		}
	}
}

async function digest(value: string): Promise<string> {
	const data = new TextEncoder().encode(`streamhata-lock:${value}`);
	const hash = await crypto.subtle.digest('SHA-256', data);

	return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
