import type { Platform, YamlPlatform } from '@shared/services/yaml-parser';
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
import { YamlParser } from '@shared/services/yaml-parser';
import { HotbarStore } from './hotbar.store';

interface SettingsState {
	platforms: YamlPlatform[];
}

const initialState: SettingsState = {
	platforms: [],
};

export const SettingsStore = signalStore(
	{ providedIn: 'root' },
	withState<SettingsState>(initialState),

	withHooks((state, service = inject(YamlParser), destroy = inject(DestroyRef)) => ({
		onInit: () => {
			service
				.parse()
				.pipe(takeUntilDestroyed(destroy))
				.subscribe({
					next: (data) => {
						patchState(state, {
							platforms: data,
						});
					},
				});
		},
	})),

	withComputed((state, hotbarStore = inject(HotbarStore)) => ({
		loadedPlatforms: computed(() => state.platforms()),
		selectedPlatforms: computed(() => {
			const hotbarPlatforms = hotbarStore.state()?.hotbarState.platforms ?? [];
			return state
				.platforms()
				.flatMap((g) => {
					return g.platforms;
				})
				.filter((p) => {
					return hotbarPlatforms.some((i) =>
						p.code.toLocaleLowerCase().includes(i.code.toLowerCase()),
					);
				});
		}),
	})),

	withMethods((state, hotbarStore = inject(HotbarStore)) => ({
		patchHotbar: (platforms: Platform[]) => {
			return hotbarStore.updateHotbar(platforms).pipe();
		},
	})),
);
