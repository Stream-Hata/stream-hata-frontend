import type * as luxon from 'luxon';
import type { AppBackendState } from '../../../shared/services/hotbar.service';

import type { Platform } from '../../../shared/services/yaml-parser';

import type { PlatformInfo } from '../../../shared/types/hotbar-state';
import { computed, DestroyRef, inject } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { DateTime } from 'luxon';
import { map, switchMap, tap, timer } from 'rxjs';
import { HotbarService } from '../../../shared/services/hotbar.service';

interface AppState {
	state: AppBackendState | null;
	isLoading: boolean;
}

const initialState: AppState = {
	isLoading: false,
	state: null,
};

export function padded(value: number) {
	return String(value).padStart(2, '0');
}

export const HotbarStore = signalStore(
	{ providedIn: 'root' },
	withState(initialState),
	withHooks((state, destroyRef = inject(DestroyRef), service = inject(HotbarService)) => ({
		onInit: () => {
			service
				.initialLoad()
				.pipe(
					tap((data) => {
						patchState(state, {
							state: data,
							isLoading: false,
						});
					}),
					switchMap(() => timer(1000, 1000)),
					switchMap(() => service.initialLoad()),
					takeUntilDestroyed(destroyRef),
				)
				.subscribe({
					next: (data) => {
						patchState(state, {
							state: data,
							isLoading: false,
						});
					},
				});
		},
	})),
	withComputed((state) => ({
		currentTime: computed(() => {
			const time = state.state()?.timerState.time;

			return DateTime.fromFormat(
				`${padded(time?.hours ?? 0)}:${padded(time?.minutes ?? 0)}:${padded(time?.seconds ?? 0)}`,
				'HH:mm:ss',
			);
		}),
		platforms: computed(() => {
			return state.state()?.hotbarState.platforms ?? [];
		}),
		appMode: computed(() => {
			return state.state()?.mode ?? 'solo';
		}),
	})),
	withMethods((state, service = inject(HotbarService)) => {
		const sendTime = (time: luxon.DateTime, mode: 'play' | 'pause') => {
			return service
				.updateState({
					timerState: {
						mode,
						time: {
							minutes: Number(padded(time.minute)),
							seconds: Number(padded(time.second)),
							hours: Number(padded(time.hour)),
						},
					},
				})
				.pipe(
					map((data) => {
						patchState(state, {
							state: data,
						});
					}),
				);
		};

		const updateHotbarState = (platforms: Platform[]) => {
			const newState: PlatformInfo[] = platforms.map((p) => ({
				name: p.name,
				completedGamesCount: 0,
				icon: p.icon,
				code: p.code,
			}));

			return service.updateState({
				hotbarState: {
					platforms: newState,
				},
			});
		};
		return {
			start: (time: DateTime) => {
				return sendTime(time, 'play');
			},
			pause: (time: DateTime) => {
				return sendTime(time, 'pause');
			},
			updateHotbar: (platforms: Platform[]) => {
				return updateHotbarState(platforms).pipe(
					tap((data) =>
						patchState(state, {
							state: data,
						}),
					),
				);
			},
		};
	}),
);
