import type { Platform, YamlPlatform } from '@shared/services/yaml-parser';

import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PlatformBar } from '@shared/services/platform-bar';
import { TuiIcon } from '@taiga-ui/core';

@Component({
	imports: [TuiIcon],
	selector: 'app-platform-maintainer',
	styleUrl: './platform-maintainer.scss',
	templateUrl: './platform-maintainer.html',
})
export class PlatformMaintainer {
	readonly selectedPlatformsLocal = signal<Platform[]>([]);
	private readonly platformBar = inject(PlatformBar);
	readonly data = input.required<YamlPlatform>();
	private readonly destroy = inject(DestroyRef);

	readonly listShown = signal(false);

	readonly isSelected = (platform: Platform) =>
		this.selectedPlatformsLocal().some((p) => p.code === platform.code);

	togglePlatform(platform: Platform) {
		this.platformBar.toggleSelected(platform).pipe(takeUntilDestroyed(this.destroy)).subscribe();
	}

	constructor() {
		effect(() => {
			const selected = this.platformBar.selected;

			this.selectedPlatformsLocal.set(
				selected().filter((platform) =>
					this.data().platforms.some((item) => item.code === platform.code),
				),
			);
		});
	}
}
