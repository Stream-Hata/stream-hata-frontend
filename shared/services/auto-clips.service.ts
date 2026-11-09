import { effect, inject, Injectable, signal } from '@angular/core';
import { AlertsService } from './alerts.service';
import { NotificationCenterService } from './notification-center.service';
import { TwitchService } from './twitch.service';

interface AutoClipState {
	enabled: boolean;
	types: string[];
	cooldownSeconds: number;
}

const STORAGE_KEY = 'nsh.auto-clips';
const DEFAULTS: AutoClipState = {
	enabled: false,
	types: ['raid', 'subscribe', 'donation', 'cheer'],
	cooldownSeconds: 90,
};

@Injectable({ providedIn: 'root' })
export class AutoClipsService {
	private readonly alerts = inject(AlertsService);
	private readonly twitch = inject(TwitchService);
	private readonly center = inject(NotificationCenterService);
	private readonly state = signal<AutoClipState>(this.load());
	private readonly seen = new Set<string>();
	private primed = false;
	private lastClipAt = 0;
	private readonly invoke = (
		window as unknown as { __TAURI_INTERNALS__?: { invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown> } }
	).__TAURI_INTERNALS__?.invoke;

	readonly enabled = signal(false);
	readonly types = signal<string[]>(DEFAULTS.types);
	readonly cooldownSeconds = signal(DEFAULTS.cooldownSeconds);

	constructor() {
		this.enabled.set(this.state().enabled);
		this.types.set(this.state().types);
		this.cooldownSeconds.set(this.state().cooldownSeconds);
		effect(() => {
			this.state.set({
				enabled: this.enabled(),
				types: this.types(),
				cooldownSeconds: this.cooldownSeconds(),
			});
			this.save(this.state());
		});
		effect(() => {
			const events = this.alerts.state()?.events ?? [];

			if (!this.primed) {
				for (const event of events) {
					this.seen.add(event.id);
				}
				this.primed = true;

				return;
			}
			for (const event of events) {
				if (this.seen.has(event.id)) {
					continue;
				}
				this.seen.add(event.id);
				if (this.enabled() && this.types().includes(event.type) && Date.now() - this.lastClipAt >= this.cooldownSeconds() * 1000) {
					this.lastClipAt = Date.now();
					this.createClip(event.type, event.username);
				}
			}
		});
	}

	toggleType(type: string): void {
		this.types.update((types) =>
			types.includes(type) ? types.filter((item) => item !== type) : [...types, type],
		);
	}

	private createClip(type: string, username: string): void {
		this.twitch.createClip().subscribe({
			next: () => {
				const body = `Создан клип по событию ${type}${username ? ` · ${username}` : ''}.`;
				this.center.add('Авто-клип', body, 'clip');
				void this.invoke?.('system_alert', {
					title: 'StreamHata · Авто-клип',
					body,
				});
			},
			error: () => undefined,
		});
	}

	private load(): AutoClipState {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);

			return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AutoClipState>) } : { ...DEFAULTS };
		} catch {
			return { ...DEFAULTS };
		}
	}

	private save(value: AutoClipState): void {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
		} catch {
			// storage unavailable
		}
	}
}
