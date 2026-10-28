import type {
	ActionItem,
	AnalyticsState,
	NotifySettings,
	ObsStatus,
	StreamInfo,
} from '@shared/types/stream';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ObsLocalService } from '@shared/services/obs-local.service';
import { defer, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ObsService {
	private readonly http = inject(HttpClient);
	private readonly local = inject(ObsLocalService);
	private isDesktop(): boolean {
		return (
			typeof window !== 'undefined' &&
			('__TAURI_INTERNALS__' in window ||
				(window as unknown as Record<string, unknown>)['__STREAMHATA_DESKTOP__'] === true ||
				navigator.userAgent.includes('NamelessStreamHataDesktop'))
		);
	}

	status() {
		return this.isDesktop()
			? defer(() => this.local.status())
			: this.http.get<ObsStatus>('rgg-sync/obs');
	}

	connect(url: string, password: string) {
		return this.isDesktop()
			? defer(() => this.local.connect(url, password))
			: this.http.post<ObsStatus>('rgg-sync/obs/connect', { url, password });
	}

	disconnect() {
		return this.isDesktop()
			? defer(() => this.local.disconnect())
			: this.http.post<ObsStatus>('rgg-sync/obs/disconnect', {});
	}

	scene(scene: string) {
		return this.isDesktop()
			? defer(() => this.local.scene(scene))
			: this.http.post<unknown>('rgg-sync/obs/action', { type: 'scene', scene });
	}

	mute(input: string) {
		return this.isDesktop()
			? defer(() => this.local.mute(input))
			: this.http.post<{ muted: boolean }>('rgg-sync/obs/action', { type: 'mute', input });
	}

	output(output: string, action: string) {
		return this.isDesktop()
			? defer(() => this.local.output(output, action))
			: this.http.post<unknown>('rgg-sync/obs/action', { type: 'output', output, action });
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
		return this.http.post<{ ok: boolean }>('rgg-sync/notify/test', {});
	}

	chats() {
		return this.http.get<{ chats: { id: number; title?: string; username?: string; type?: string }[] }>('rgg-sync/notify/telegram/chats');
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
