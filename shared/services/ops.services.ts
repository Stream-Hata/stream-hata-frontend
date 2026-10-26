import type { Trigger } from '@shared/types/automation';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface NetworkSettings {
	proxyUrl: string;
	enabled: boolean;
}

export interface MetricsSnapshot {
	session: {
		peakViewers: number;
		avgViewers: number;
		messages: number;
		endedAt: string | null;
	} | null;
	donations: { totalCount: number; totals: Record<string, number> };
	topPoints: { displayName: string; balance: number }[];
	music: { totalTracks: number; totalDurationSeconds: number };
	history: unknown[];
}

@Injectable({ providedIn: 'root' })
export class TriggersService {
	private readonly http = inject(HttpClient);

	list() {
		return this.http.get<{ triggers: Trigger[] }>('rgg-sync/triggers');
	}

	save(triggers: Trigger[]) {
		return this.http.post<{ triggers: Trigger[] }>('rgg-sync/triggers', { triggers });
	}
}

@Injectable({ providedIn: 'root' })
export class NetworkService {
	private readonly http = inject(HttpClient);

	get() {
		return this.http.get<NetworkSettings>('rgg-sync/network');
	}

	save(settings: NetworkSettings) {
		return this.http.post<NetworkSettings>('rgg-sync/network', settings);
	}

	test() {
		return this.http.post<{ ok: boolean }>('rgg-sync/network/test', {});
	}
}

@Injectable({ providedIn: 'root' })
export class MetricsService {
	private readonly http = inject(HttpClient);

	get() {
		return this.http.get<MetricsSnapshot>('rgg-sync/metrics');
	}

	sendTelegram() {
		return this.http.post<{ ok: boolean }>('rgg-sync/metrics/telegram', {});
	}
}
