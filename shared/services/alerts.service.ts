import type { AlertSettings, AlertsState } from '@shared/types/automation';
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, timer } from 'rxjs';

const READ_KEY = 'nsh-alert-read-ids';

function loadReadIds(): Set<string> {
	try {
		const raw = localStorage.getItem(READ_KEY);
		const parsed: unknown = raw ? JSON.parse(raw) : [];

		return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
	} catch {
		return new Set();
	}
}

@Injectable({ providedIn: 'root' })
export class AlertsService {
	private readonly http = inject(HttpClient);
	private readonly readIds = signal<Set<string>>(loadReadIds());

	readonly state = toSignal(
		timer(0, 5000).pipe(
			switchMap(() =>
				this.http.get<AlertsState>('rgg-sync/alerts').pipe(catchError(() => of(null))),
			),
		),
		{ initialValue: null as AlertsState | null },
	);

	readonly unreadCount = computed(
		() => (this.state()?.events ?? []).filter((event) => !this.readIds().has(event.id)).length,
	);

	isRead(id: string): boolean {
		return this.readIds().has(id);
	}

	markAllRead(): void {
		const ids = new Set([
			...(this.state()?.events ?? []).map((event) => event.id),
			...this.readIds(),
		]);

		this.readIds.set(ids);
		this.persist(ids);
	}

	private persist(ids: Set<string>): void {
		try {
			localStorage.setItem(READ_KEY, JSON.stringify([...ids].slice(-1000)));
		} catch {
			undefined;
		}
	}

	getState() {
		return this.http.get<AlertsState>('rgg-sync/alerts');
	}

	saveSettings(settings: AlertSettings) {
		return this.http.post<AlertSettings>('rgg-sync/alerts/settings', settings);
	}

	notify(type: string, username: string, message: string) {
		return this.http.post<unknown>('rgg-sync/alerts/notify', { type, username, message });
	}

	test(type: string) {
		return this.http.post<unknown>('rgg-sync/alerts/test', { type });
	}
}
