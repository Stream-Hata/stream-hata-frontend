import type { Platform, YamlPlatform } from '@shared/services/yaml-parser';
import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { YamlParser } from '@shared/services/yaml-parser';
import { catchError, of } from 'rxjs';

export interface CatalogPlatform extends Platform {
	maintainer: string;
}

export function platformIcon(platform?: Platform | null): string {
	return platform?.icon ? `icons/platforms/${platform.icon}` : 'icons/platforms/consoles.svg';
}

export function normalizeSlots(slots?: string[] | null): string[] {
	const result = [...(slots ?? [])].slice(0, 10);

	while (result.length < 10) {
		result.push('');
	}

	return result;
}

export function appendSlot(slots: string[], code: string): string[] {
	const result = normalizeSlots(slots);

	if (result.includes(code)) {
		return result;
	}

	const index = result.findIndex((value) => !value);

	if (index >= 0) {
		result[index] = code;
	}

	return result;
}

export function removeSlot(slots: string[], index: number): string[] {
	const result = normalizeSlots(slots);

	result[index] = '';

	return result;
}

export function reorderSlots(slots: string[], from: number, to: number): string[] {
	if (from === to) {
		return normalizeSlots(slots);
	}

	const result = normalizeSlots(slots);
	const [moved] = result.splice(from, 1);

	result.splice(to, 0, moved ?? '');

	return result.slice(0, 10);
}

@Injectable({ providedIn: 'root' })
export class PlatformCatalogService {
	private readonly parser = inject(YamlParser);

	readonly groups = toSignal(
		this.parser.parse().pipe(catchError(() => of([] as YamlPlatform[]))),
		{ initialValue: [] as YamlPlatform[] },
	);

	readonly platforms = computed<CatalogPlatform[]>(() => {
		const result = new Map<string, CatalogPlatform>();

		for (const group of this.groups()) {
			for (const platform of group.platforms) {
				const current = result.get(platform.code);

				if (!current || (!current.icon && platform.icon)) {
					result.set(platform.code, { ...platform, maintainer: group.maintainer });
				}
			}
		}

		return [...result.values()].sort((left, right) => left.name.localeCompare(right.name));
	});

	readonly byCode = computed(() => {
		const map = new Map<string, CatalogPlatform>();

		for (const platform of this.platforms()) {
			map.set(platform.code, platform);
		}

		return map;
	});

	readonly grouped = computed(() => {
		const seen = new Set<string>();

		return this.groups().map((group) => ({
			maintainer: group.maintainer,
			platforms: group.platforms.filter((platform) => {
				if (seen.has(platform.code)) {
					return false;
				}

				seen.add(platform.code);

				return true;
			}),
		}));
	});

	icon(platform?: Platform | null): string {
		return platformIcon(platform);
	}
}
