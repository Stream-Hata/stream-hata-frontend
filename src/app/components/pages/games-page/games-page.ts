import type { Game, GameListResponse, GameTier } from '@shared/types/game';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { imageUrl } from '@shared/helpers/proxy-image';
import { GamesCatalogService } from '@shared/services/games-catalog.service';
import { PlatformCatalogService } from '@shared/services/platform-catalog.service';
import { RoleService } from '@shared/services/role.service';
import { I18nService } from '@shared/services/i18n.service';
import {
	TuiButton,
	TuiDropdown,
	TuiDropdownHover,
	TuiIcon,
	TuiInput,
	tuiItemsHandlersProvider,
	TuiSelectLike,
	TuiTextfield,
} from '@taiga-ui/core';
import {
	TuiBadge,
	TuiChevron,
	TuiDataListWrapper,
	TuiInputNumber,
	TuiSegmented,
	TuiSelect,
	TuiSwitch,
} from '@taiga-ui/kit';
import { catchError, debounceTime, of, skip, startWith, timer } from 'rxjs';

const EMPTY_RESPONSE: GameListResponse = {
	items: [],
	total: 0,
	page: 1,
	pageSize: 24,
	facets: { platforms: [], tiers: [], ages: [] },
};

const TIER_LABELS: Record<GameTier, string> = {
	none: '',
	gold: 'Gold',
	diamond: 'Diamond',
	platinum: 'Platinum',
};

@Component({
	imports: [
		ReactiveFormsModule,
		RouterLink,
		TuiBadge,
		TuiButton,
		TuiChevron,
		TuiDataListWrapper,
		TuiDropdown,
		TuiDropdownHover,
		TuiIcon,
		TuiInput,
		TuiInputNumber,
		TuiSegmented,
		TuiSelect,
		TuiSelectLike,
		TuiSwitch,
		TuiTextfield,
	],
	providers: [
		tuiItemsHandlersProvider({
			stringify: signal(
				(value: string) =>
					({
						rawg: 'RAWG',
						igdb: 'IGDB',
						rating: 'По рейтингу',
						new: 'Новые',
						popular: 'Популярные',
					})[value] ?? value,
			),
		}),
	],
	selector: 'app-games-page',
	styleUrl: './games-page.scss',
	templateUrl: './games-page.html',
})
export default class GamesPage {
	private readonly catalog = inject(GamesCatalogService);
	private readonly roles = inject(RoleService);
	readonly i18n = inject(I18nService);
	private autoImportStarted = false;

	readonly canImport = computed(() => this.roles.isAdmin());
	private readonly destroyRef = inject(DestroyRef);
	private readonly route = inject(ActivatedRoute);

	readonly pageSize = 24;
	protected readonly imageUrl = imageUrl;
	readonly page = signal(1);
	readonly pageControl = new FormControl<number | null>(null, { nonNullable: true });
	readonly pageMode = signal<'buttons' | 'input'>('buttons');
	readonly loading = signal(true);
	readonly importing = signal(false);
	readonly importOpen = signal(false);
	readonly importResult = signal('');
	readonly importSources = ['RAWG', 'IGDB', 'Steam'];
	readonly importSourceControl = new FormControl('RAWG', { nonNullable: true });
	readonly importQueryControl = new FormControl('', { nonNullable: true });
	readonly importSearching = signal(false);
	readonly importSearchText = signal('');
	readonly importLimitControl = new FormControl(20000, { nonNullable: true });
	readonly importMinRatingControl = new FormControl(0, { nonNullable: true });
	readonly importOrderControl = new FormControl('По рейтингу', { nonNullable: true });
	readonly importYearFromControl = new FormControl(0, { nonNullable: true });
	readonly importYearToControl = new FormControl(0, { nonNullable: true });
	readonly importOrderValues = ['По рейтингу', 'Новые', 'Популярные'];
	readonly importOnlyMissingControl = new FormControl(true, { nonNullable: true });
	readonly response = signal<GameListResponse>(EMPTY_RESPONSE);
	private readonly platformCatalog = inject(PlatformCatalogService);
	readonly form = new FormGroup({
		q: new FormControl('', { nonNullable: true }),
		platform: new FormControl('Все платформы', { nonNullable: true }),
		tier: new FormControl('Все тиры', { nonNullable: true }),
		age: new FormControl('Любой возраст', { nonNullable: true }),
		emulator: new FormControl('Любой эмулятор', { nonNullable: true }),
		verified: new FormControl(false, { nonNullable: true }),
		yearFrom: new FormControl<number | null>(null),
		yearTo: new FormControl<number | null>(null),
	});

	readonly totalPages = computed(() =>
		Math.max(1, Math.ceil(this.response().total / this.pageSize)),
	);
	readonly pageList = computed(() => {
		const total = this.totalPages();
		const current = this.page();
		const pages = new Set<number>([1, total]);

		for (let page = Math.max(1, current - 4); page <= Math.min(total, current + 4); page++) {
			pages.add(page);
		}

		return [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
	});

	readonly tierValues: GameTier[] = ['gold', 'diamond', 'platinum'];
	readonly tierSelectValues = ['Все тиры', 'Gold', 'Diamond', 'Platinum'];
	readonly platformValues = computed(() => [
		'Все платформы',
		...this.platformCatalog.platforms().map((platform) => platform.name),
	]);
	readonly ageSelectValues = ['Любой возраст', 'Классика', 'Ретро', 'Современные', 'Новые'];
	readonly emulatorSelectValues = ['Любой эмулятор', 'Только с эмулятором', 'Без эмулятора'];
	readonly ageValues = [
		{ value: 'classic', label: 'Классика' },
		{ value: 'retro', label: 'Ретро' },
		{ value: 'modern', label: 'Современные' },
		{ value: 'new', label: 'Новые' },
	];

	constructor() {
		const preload = this.route.snapshot.data['games'] as GameListResponse | undefined;

		if (preload) {
			this.response.set(preload);
			this.loading.set(false);
		}

		this.form.valueChanges
			.pipe(
				startWith(this.form.getRawValue()),
				skip(preload ? 1 : 0),
				debounceTime(250),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => {
				this.page.set(1);
				this.load();
			});

		timer(15000, 15000)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.load(true));

		effect(() => {
			if (this.canImport() && !this.autoImportStarted) {
				this.autoImportStarted = true;
				this.runAutoImport();
			}
		});
	}

	load(silent = false): void {
		if (!silent) {
			this.loading.set(true);
		}

		const value = this.form.getRawValue();

		this.catalog
			.list({
				q: value.q,
				platform:
					this.platformCatalog.platforms().find((platform) => platform.name === value.platform)?.code ?? '',
				tier:
					({ Gold: 'gold', Diamond: 'diamond', Platinum: 'platinum' } as Record<
						string,
						string
					>)[value.tier] ?? '',
				age:
					({ Классика: 'classic', Ретро: 'retro', Современные: 'modern', Новые: 'new' } as Record<
						string,
						string
					>)[value.age] ?? '',
				emulator:
					value.emulator === 'Только с эмулятором'
						? true
						: value.emulator === 'Без эмулятора'
							? false
							: null,
				verified: value.verified || undefined,
				yearFrom: value.yearFrom ?? undefined,
				yearTo: value.yearTo ?? undefined,
				page: this.page(),
				pageSize: this.pageSize,
				sort: 'title',
				order: 'asc',
			})
			.pipe(
				catchError(() => of(EMPTY_RESPONSE)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((response) => {
				this.response.set(response);
				this.loading.set(false);
			});
	}

	importCatalog(): void {
		if (this.importSourceControl.value === 'Steam') {
			const query = this.importQueryControl.value.trim();

			if (!query) {
				this.importResult.set('Введи название игры для импорта из Steam');

				return;
			}

			this.importing.set(true);
			this.importResult.set('');
			this.catalog
				.importSearch(query, 'steam')
				.pipe(
					catchError(() => of(null)),
					takeUntilDestroyed(this.destroyRef),
				)
				.subscribe((result) => {
					this.importing.set(false);
					this.importResult.set(
						result
							? `Steam: добавлено ${result.imported}, пропущено ${result.skipped}`
							: 'Steam: не удалось импортировать игру',
					);

					if (result?.imported) {
						this.load(true);
					}
				});

			return;
		}

		this.importing.set(true);
		this.importResult.set('');

		this.catalog
			.import({
				source: this.importSourceControl.value === 'IGDB' ? 'igdb' : 'rawg',
				limit: this.importLimitControl.value,
				minRating: this.importMinRatingControl.value,
				order:
					this.importOrderControl.value === 'Новые'
						? 'new'
						: this.importOrderControl.value === 'Популярные'
							? 'popular'
							: 'rating',
				yearFrom: this.importYearFromControl.value,
				yearTo: this.importYearToControl.value,
				onlyMissing: true,
			})
			.pipe(
				catchError((response) => {
					this.importResult.set(response.error?.error ?? 'Не удалось импортировать');

					return of(null);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				this.importing.set(false);

				if (result) {
					this.importResult.set(
						result.running
							? 'Импорт уже выполняется в фоне'
							: `Добавлено ${result.imported}, пропущено ${result.skipped}, всего ${result.total}`,
					);

					if (!result.running) {
						this.page.set(1);
						this.load();
						this.importOpen.set(false);
					}
				}
			});
	}

	importByQuery(): void {
		const query = this.importQueryControl.value.trim();

		if (!query || this.importSearching()) {
			return;
		}

		this.importSearching.set(true);
		this.importSearchText.set('');

		this.catalog
			.importSearch(query)
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				this.importSearching.set(false);

				if (!result) {
					this.importSearchText.set('Не удалось добавить игру');

					return;
				}

				this.importSearchText.set(
					`Добавлено: ${result.imported}, пропущено: ${result.skipped}`,
				);

				if (result.imported > 0) {
					this.load(true);
				}
			});
	}

	private runAutoImport(): void {
		this.catalog
			.import({
				source: 'rawg',
				limit: 500,
				minRating: 0,
				order: 'new',
				yearFrom: 0,
				yearTo: 0,
				onlyMissing: true,
			})
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				if (result) {
					this.load(true);
				}
			});
	}

	setPage(page: number): void {
		if (page < 1 || page > this.totalPages()) {
			return;
		}

		this.page.set(page);
		this.pageControl.setValue(page);
		this.load();
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	goToPage(): void {
		const target = Math.trunc(Number(this.pageControl.value));

		if (!Number.isFinite(target) || target < 1) {
			this.pageControl.setValue(this.page());

			return;
		}

		this.setPage(Math.min(target, this.totalPages()));
	}

	tierLabel(tier: GameTier): string {
		return TIER_LABELS[tier];
	}

	emulatorLabel(game: Game): string {
		if (!game.emulatorsRequired) {
			return 'Эмулятор не нужен';
		}

		return `Нужен эмулятор: ${game.emulators.map((item) => item.name).join(', ') || 'да'}`;
	}

	initials(title: string): string {
		return title
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0] ?? '')
			.join('')
			.toUpperCase();
	}
}
