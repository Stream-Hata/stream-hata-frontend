import { Component, computed, inject, signal } from '@angular/core';
import { SettingsStore } from '@app/stores/settings.store';
import { TuiIcon } from '@taiga-ui/core';
import { PlatformMaintainer } from '../platform-maintainer/platform-maintainer';

@Component({
	imports: [TuiIcon, PlatformMaintainer],
	selector: 'app-settings-dropdown',
	styleUrl: './settings-dropdown.scss',
	templateUrl: './settings-dropdown.html',
})
export class SettingsDropdown {
	private readonly store = inject(SettingsStore);
	readonly platforms = computed(() => this.store.loadedPlatforms());

	readonly maintainersSetShown = signal(false);

	showHideMaintainersSet() {
		this.maintainersSetShown.update((v) => !v);
	}
}
