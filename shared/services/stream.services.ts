import type {
	ActionItem,
	AnalyticsState,
	NotifySettings,
	ObsStatus,
	StreamInfo,
} from '@shared/types/stream';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ObsService {
	private readonly http = inject(HttpClient);

	status() {
		return this.http.get<ObsStatus>('rgg-sync/obs');
	}

	connect(url: string, password: string) {
		return this.http.post<ObsStatus>('rgg-sync/obs/connect', { url, password });
	}

	disconnect() {
		return this.http.post<ObsStatus>('rgg-sync/obs/disconnect', {});
	}

	scene(scene: string) {
		return this.http.post<unknown>('rgg-sync/obs/action', { type: 'scene', scene });
	}

	mute(input: string) {
		return this.http.post<{ muted: boolean }>('rgg-sync/obs/action', { type: 'mute', input });
	}

	output(output: string, action: string) {
		return this.http.post<unknown>('rgg-sync/obs/action', { type: 'output', output, action });
	}
}

@Injectable({ providedIn: 'root' })
export class StreamService {
	private readonly http = inject(HttpClient);

	info() {
		return this.http.get<StreamInfo>('rgg-sync/stream');
	}

	update(title: string, gameQuery: string) {
		return this.http.post<StreamInfo>('rgg-sync/stream', { title, gameQuery });
	}

	commercial(length: number) {
		return this.http.post<unknown>('rgg-sync/stream/commercial', { length });
	}

	shield(active: boolean) {
		return this.http.post<unknown>('rgg-sync/stream/shield', { active });
	}
}

@Injectable({ providedIn: 'root' })
export class NotifyService {
	private readonly http = inject(HttpClient);

	settings() {
		return this.http.get<NotifySettings>('rgg-sync/notify');
	}

	save(settings: NotifySettings) {
		return this.http.post<NotifySettings>('rgg-sync/notify', settings);
	}

	test() {
		return this.http.post<unknown>('rgg-sync/notify/test', {});
	}
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
	private readonly http = inject(HttpClient);

	state() {
		return this.http.get<AnalyticsState>('rgg-sync/analytics');
	}

	get exportUrl(): string {
		return 'rgg-sync/analytics/export';
	}

	actions() {
		return this.http.get<{ actions: ActionItem[] }>('rgg-sync/actions');
	}
}
