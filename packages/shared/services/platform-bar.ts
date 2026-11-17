import type { Platform } from './yaml-parser';
import { inject, Service } from '@angular/core';
import { SettingsStore } from '@app/stores/settings.store';

@Service({
	autoProvided: true,
})
export class PlatformBar {
	private readonly store = inject(SettingsStore);

	readonly selected = this.store.selectedPlatforms;

	toggleSelected(item: Platform) {
		const selected = this.selected();

		const exists = selected.some((p) => p.code === item.code);

		if (exists) {
			const filtered = selected.filter((s) => s.code !== item.code);
			return this.store.patchHotbar(filtered);
		}

		return this.store.patchHotbar([...selected, item]);
	}
}
