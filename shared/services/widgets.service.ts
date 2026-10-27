import type { Observable } from 'rxjs';
import type { DonationWidgetConfig } from '@shared/types/donation';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { switchMap, tap, timer } from 'rxjs';

export interface WidgetsState {
	widgets: Record<string, boolean>;
}

@Injectable({ providedIn: 'root' })
export class WidgetsService {
	private readonly http = inject(HttpClient);

	get(): Observable<WidgetsState> {
		return this.http.get<WidgetsState>('rgg-sync/widgets');
	}

	set(kind: string, enabled: boolean): Observable<WidgetsState> {
		return this.http.post<WidgetsState>(`rgg-sync/widgets/${kind}`, { enabled });
	}
}

export interface WidgetConfig {
	title?: string;
	maxRows?: number;
	durationSeconds?: number;
	showEmotes?: boolean;
	showTimestamps?: boolean;
	chatAnimation?: boolean;
	chatChannelMode?: 'all' | 'original';
	streakMin?: number;
	streakEvery?: number;
	transparent?: boolean;
	backgroundColor?: string;
	textColor?: string;
	accentColor?: string;
	scale?: number;
	timerMode?: 'countdown' | 'count-up';
	timerLabel?: string;
	timerShowLabel?: boolean;
	timerDurationSeconds?: number;
	timerCountFromSeconds?: number;
	timerCountToSeconds?: number | null;
	timerSize?: 'small' | 'medium' | 'large';
	timerShowProgress?: boolean;
	timerProgressColor?: string;
	timerFontFamily?: string;
	timerFontUrl?: string;
	timerAlign?: 'left' | 'center' | 'right';
	timerVerticalAlign?: 'top' | 'middle' | 'bottom';
	hotbarSlots?: string[];
	hotbarShowTimer?: boolean;
	hotbarShowSettings?: boolean;
	hotbarIconSize?: 's' | 'm' | 'l';
	hotbarGap?: number;
	hotbarBackground?: string;
	hotbarLabelColor?: string;
	hotbarEmptyColor?: string;
	donation?: DonationWidgetConfig;
	showVideo?: boolean;
	showControls?: boolean;
	juryShowProgress?: boolean;
	juryShowTimer?: boolean;
	juryShowChannel?: boolean;
	juryShowQuestion?: boolean;
	juryShowAuthors?: boolean;
	juryYeaColor?: string;
	juryNeiColor?: string;
	juryStyle?: string;
	juryTheme?: 'dark' | 'light';
	juryDensity?: 's' | 'm' | 'l';
	juryAnimation?: boolean;
	jurySpeed?: number;
}

@Injectable({ providedIn: 'root' })
export class WidgetConfigService {
	private readonly http = inject(HttpClient);
	private readonly cachedConfigs = signal<Record<string, WidgetConfig>>({});
	readonly configs = this.cachedConfigs.asReadonly();

	private cache(kind: string, config: WidgetConfig): void {
		this.cachedConfigs.update((configs) => ({ ...configs, [kind]: config }));
	}

	get(kind: string): Observable<{ config: WidgetConfig }> {
		return this.http
			.get<{ config: WidgetConfig }>(`rgg-sync/widgets/${kind}/config`)
			.pipe(tap((response) => this.cache(kind, response.config)));
	}

	watch(kind: string): Observable<{ config: WidgetConfig }> {
		return timer(0, 3000).pipe(
			switchMap(() =>
				this.http
					.get<{ config: WidgetConfig }>(`rgg-sync/widgets/${kind}/config`, {
						params: { t: Date.now() },
					})
					.pipe(tap((response) => this.cache(kind, response.config))),
			),
		);
	}

	save(kind: string, config: WidgetConfig): Observable<{ config: WidgetConfig }> {
		return this.http
			.put<{ config: WidgetConfig }>(`rgg-sync/widgets/${kind}/config`, config)
			.pipe(tap((response) => this.cache(kind, response.config)));
	}
}
