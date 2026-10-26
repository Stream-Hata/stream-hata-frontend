import type { Subscription } from 'rxjs';
import { Component, computed, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiAutoFocus } from '@taiga-ui/cdk';
import { TuiIcon, TuiInput, TuiTextfield } from '@taiga-ui/core';
import { timer } from 'rxjs';

export type SearchGroup = 'games' | 'pages' | 'settings' | 'widgets';

export interface SearchItem {
	id: string;
	group: SearchGroup;
	title: string;
	subtitle: string;
	icon: string;
	link: string;
	keywords: string;
	thumbnail?: string;
}

const GROUP_ORDER: SearchGroup[] = ['games', 'pages', 'settings', 'widgets'];

@Component({
	imports: [TuiAutoFocus, TuiIcon, TuiInput, TuiTextfield],
	selector: 'app-search',
	styleUrl: './app-search.scss',
	templateUrl: './app-search.html',
})
export class AppSearch {
	readonly open = input(false);
	readonly items = input<SearchItem[]>([]);
	readonly gameResults = input<SearchItem[]>([]);
	readonly groupLabels = input<Record<SearchGroup, string>>({
		games: 'Игры',
		pages: 'Страницы',
		settings: 'Настройки',
		widgets: 'Виджеты',
	});

	readonly hint = input('↑↓ — выбор · Enter — открыть · Esc — закрыть');
	readonly title = input('Поиск по приложению');
	readonly placeholder = input('Страницы, настройки, виджеты…');
	readonly closed = output<void>();
	readonly navigate = output<string>();
	readonly queryChange = output<string>();

	readonly query = signal('');
	readonly active = signal(0);
	readonly visible = signal(false);
	readonly closing = signal(false);

	private readonly destroyRef = inject(DestroyRef);
	private closeSubscription?: Subscription;
	private mounted = false;

	readonly allItems = computed(() => [...this.gameResults(), ...this.items()]);
	readonly filtered = computed(() => {
		const query = normalize(this.query());
		const games = this.gameResults();

		if (!query) {
			return [...games, ...this.items()];
		}

		return [
			...games,
			...this.items().filter((item) =>
				normalize(`${item.title} ${item.subtitle} ${item.keywords}`).includes(query),
			),
		];
	});

	readonly groups = computed(() =>
		GROUP_ORDER.map((group) => ({
			group,
			label: this.groupLabels()[group],
			items: this.filtered().filter((item) => item.group === group),
		})).filter((section) => section.items.length > 0),
	);

	constructor() {
		effect(() => {
			if (this.open()) {
				this.closeSubscription?.unsubscribe();
				this.mounted = true;
				this.visible.set(true);
				this.closing.set(false);
				this.query.set('');
				this.active.set(0);

				return;
			}

			if (!this.mounted) {
				return;
			}

			this.closing.set(true);
			this.closeSubscription = timer(180)
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe(() => {
					this.mounted = false;
					this.closing.set(false);
					this.visible.set(false);
				});
		});
	}

	onInput(event: Event): void {
		const value = (event.target as HTMLInputElement).value;

		this.query.set(value);
		this.active.set(0);
		this.queryChange.emit(value);
	}

	onKeydown(event: KeyboardEvent): void {
		const total = this.filtered().length;

		if (event.key === 'Escape') {
			event.preventDefault();
			this.closed.emit();

			return;
		}

		if (!total) {
			return;
		}

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			this.active.update((index) => (index + 1) % total);

			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			this.active.update((index) => (index - 1 + total) % total);

			return;
		}

		if (event.key === 'Enter') {
			event.preventDefault();
			this.select(this.filtered()[this.active()]);
		}
	}

	isActive(item: SearchItem): boolean {
		return this.filtered()[this.active()]?.id === item.id;
	}

	select(item: SearchItem | undefined): void {
		if (!item) {
			return;
		}

		this.navigate.emit(item.link);
		this.closed.emit();
	}
}

function normalize(value: string): string {
	return value.trim().toLowerCase();
}
