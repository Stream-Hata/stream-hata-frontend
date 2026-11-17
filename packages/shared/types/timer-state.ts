import type { Default } from './default';
import type { HotbarState } from './hotbar-state';

export interface Time {
	minutes: number;
	hours: number;
	seconds: number;
	milliseconds?: number | null;
}

export interface TimerState {
	mode: 'play' | 'pause';
	time: Default<Time, 'milliseconds', 0>;
}

export interface AppState {
	appMode: 'land' | 'solo';
	timerState: TimerState;
	hotbarState: HotbarState;
}
