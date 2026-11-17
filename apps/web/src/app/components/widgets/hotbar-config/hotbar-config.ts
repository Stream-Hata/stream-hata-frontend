import type { CatalogPlatform } from '@shared/services/platform-catalog.service';
import type { WidgetConfig } from '@shared/services/widgets.service';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
	appendSlot,
	normalizeSlots,
	PlatformCatalogService,
	removeSlot,
	reorderSlots,
} from '@shared/services/platform-catalog.service';
import { TuiButton, TuiDropdown, TuiIcon, TuiInput, TuiSelectLike, TuiSlider, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiDataListWrapper, TuiSegmented, TuiSwitch } from '@taiga-ui/kit';
import { HotbarPreview } from '../hotbar-preview/hotbar-preview';

@Component({
	imports: [
		ReactiveFormsModule,
		RouterLink,
		TuiButton,
		TuiChevron,
		TuiDataListWrapper,
		TuiDropdown,
		TuiIcon,
		TuiInput,
		TuiSegmented,
		TuiSelectLike,
		TuiSlider,
		TuiSwitch,
		TuiTextfield,
		HotbarPreview,
	],
	selector: 'app-hotbar-config',
	styleUrl: './hotbar-config.scss',
	templateUrl: './hotbar-config.html',
})
export class HotbarConfig {
	readonly catalog = inject(PlatformCatalogService);

	readonly config = input<WidgetConfig>({});
	readonly configChange = output<WidgetConfig>();
	readonly slots = signal<string[]>(normalizeSlots(this.config().hotbarSlots));
	readonly dragIndex = signal<number | null>(null);
	readonly available = computed(() => {
		const selected = new Set(this.slots());

		return this.catalog.platforms().filter((platform) => !selected.has(platform.code));
	});

	readonly availableNames = computed(() => this.available().map((platform) => platform.name));
	readonly grouped = computed(() =>
		this.catalog.grouped().map((group) => ({
			maintainer: group.maintainer,
			platforms: group.platforms.filter((platform) => !this.slots().includes(platform.code)),
		})),
	);

	readonly iconSize = signal<'s' | 'm' | 'l'>(this.config().hotbarIconSize ?? 'm');
	readonly showTimer = signal(this.config().hotbarShowTimer ?? true);
	readonly showSettings = signal(this.config().hotbarShowSettings ?? true);
	readonly gap = signal(this.config().hotbarGap ?? 6);
	readonly selectControl = new FormControl('', { nonNullable: true });

	constructor() {
		effect(() => {
			this.slots.set(normalizeSlots(this.config().hotbarSlots));
			this.iconSize.set(this.config().hotbarIconSize ?? 'm');
			this.showTimer.set(this.config().hotbarShowTimer ?? true);
			this.showSettings.set(this.config().hotbarShowSettings ?? true);
			this.gap.set(this.config().hotbarGap ?? 6);
		});
	}

	platform(code: string): CatalogPlatform | null {
		return this.catalog.byCode().get(code) ?? null;
	}

	addName(name: string): void {
		const platform = this.available().find((item) => item.name === name);

		if (!platform) {
			return;
		}

		this.update(appendSlot(this.slots(), platform.code));
		this.selectControl.setValue('');
	}

	remove(index: number): void {
		this.update(removeSlot(this.slots(), index));
	}

	dragStart(index: number): void {
		this.dragIndex.set(index);
	}

	drop(index: number): void {
		const from = this.dragIndex();

		if (from === null) {
			return;
		}

		this.update(reorderSlots(this.slots(), from, index));
		this.dragIndex.set(null);
	}

	clear(): void {
		this.update(normalizeSlots([]));
	}

	setIconSize(index: number): void {
		this.iconSize.set((['s', 'm', 'l'] as const)[index] ?? 'm');
		this.emit();
	}

	setGap(event: Event): void {
		this.gap.set(Number((event.target as HTMLInputElement).value));
		this.emit();
	}

	toggleTimer(): void {
		this.showTimer.update((value) => !value);
		this.emit();
	}

	toggleSettings(): void {
		this.showSettings.update((value) => !value);
		this.emit();
	}

	private update(slots: string[]): void {
		this.slots.set(slots);
		this.emit();
	}

	private emit(): void {
		this.configChange.emit({
			...this.config(),
			hotbarSlots: this.slots(),
			hotbarIconSize: this.iconSize(),
			hotbarShowTimer: this.showTimer(),
			hotbarShowSettings: this.showSettings(),
			hotbarGap: this.gap(),
		});
	}
}
