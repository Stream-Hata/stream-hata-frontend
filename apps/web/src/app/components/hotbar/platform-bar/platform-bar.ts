import { Component, computed, inject } from '@angular/core';
import { HotbarStore } from '@app/stores/hotbar.store';
import { Slot } from '@shared/components/slot/slot';

@Component({
	imports: [Slot],
	selector: 'app-platform-bar',
	styleUrl: './platform-bar.scss',
	templateUrl: './platform-bar.html',
})
export class PlatformBar {
	private readonly store = inject(HotbarStore);
	readonly platforms = this.store.platforms;
	readonly count = computed(() => Array.from({ length: 10 }, (_, i) => i));
}
