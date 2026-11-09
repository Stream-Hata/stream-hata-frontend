import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { GameSuggestion } from './suggestions.service';
import { NotificationCenterService } from './notification-center.service';

interface Invoke {
	(command: string, args?: Record<string, unknown>): Promise<unknown>;
}

@Injectable({ providedIn: 'root' })
export class SuggestionNotificationsService {
	private readonly http = inject(HttpClient);
	private readonly center = inject(NotificationCenterService);
	private readonly invoke = (
		window as unknown as { __TAURI_INTERNALS__?: { invoke?: Invoke } }
	).__TAURI_INTERNALS__?.invoke;
	private readonly key = 'nsh.suggestion-notified';
	private busy = false;

	constructor() {
		if (!this.invoke) {
			return;
		}
		void this.poll();
		setInterval(() => void this.poll(), 60_000);
	}

	private async poll(): Promise<void> {
		if (this.busy) {
			return;
		}
		this.busy = true;
		this.http.get<{ items: GameSuggestion[] }>('rgg-sync/game-suggestions/mine').subscribe({
			next: (response) => this.notify(response.items ?? []),
			error: () => undefined,
			complete: () => {
				this.busy = false;
			},
		});
	}

	private notify(items: GameSuggestion[]): void {
		let notified: Record<string, boolean> = {};
		try {
			notified = JSON.parse(localStorage.getItem(this.key) ?? '{}') as Record<string, boolean>;
		} catch {
			notified = {};
		}
		const fresh = items.filter((item) => item.status === 'approved' && !notified[String(item.id)]);
		if (!fresh.length) {
			return;
		}
		for (const item of fresh) {
			notified[String(item.id)] = true;
			const body = `«${item.title}» принята администрацией и добавлена в каталог.`;
			this.center.add('Заявка на игру одобрена', body, 'suggestion');
			void this.invoke?.('system_alert', {
				title: 'StreamHata · Заявка на игру одобрена',
				body,
			});
		}
		try {
			localStorage.setItem(this.key, JSON.stringify(notified));
		} catch {
			// storage unavailable
		}
	}
}
