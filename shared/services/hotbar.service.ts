import type { Default } from '../types/default';
import type { HotbarState } from '../types/hotbar-state';
import type { AppState, Time } from '../types/timer-state';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface TimerState {
	mode: 'play' | 'pause';
	time: Default<Time, 'milliseconds', 0>;
}

export interface AppBackendState {
	mode: 'land' | 'solo';
	timerState: TimerState;
	hotbarState: HotbarState;
}

/* TODO: Migrate to NG22 Service decorator */
@Injectable({
	providedIn: 'root',
})
export class HotbarService {
	private readonly http = inject(HttpClient);

	initialLoad() {
		return this.http.get<AppBackendState>('/rgg-sync/');
	}

	updateState(appState: Partial<AppState>) {
		return this.http.post<AppBackendState>('/rgg-sync/', appState);
	}
}
