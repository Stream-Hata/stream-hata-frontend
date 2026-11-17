import type { CatalogPlatform } from '@shared/services/platform-catalog.service';
import { Component, computed, inject, input } from '@angular/core';
import { PlatformCatalogService, platformIcon } from '@shared/services/platform-catalog.service';

@Component({
	selector: 'app-hotbar-preview',
	styleUrl: './hotbar-preview.scss',
	templateUrl: './hotbar-preview.html',
})
export class HotbarPreview {
	private readonly catalog = inject(PlatformCatalogService);

	readonly slots = input<string[]>([]);
	readonly size = input<'s' | 'm' | 'l'>('m');
	readonly labels = input(false);
	readonly cells = computed(() => {
		const slots = this.slots().slice(0, 10);

		while (slots.length < 10) {
			slots.push('');
		}

		return slots.map((code) => ({
			code,
			platform: code ? (this.catalog.byCode().get(code) ?? null) : null,
		}));
	});

	icon(platform: CatalogPlatform | null): string {
		return platformIcon(platform);
	}
}
