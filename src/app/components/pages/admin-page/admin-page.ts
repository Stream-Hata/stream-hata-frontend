import type { AccessRole } from '@shared/services/access.service';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { Game } from '@shared/types/game';
import type { ImportStatus, SearchAlias } from '@shared/services/games-catalog.service';
import { GamesCatalogService } from '@shared/services/games-catalog.service';
import { RoleService } from '@shared/services/role.service';
import { TuiButton, TuiIcon, TuiInput, TuiTextfield } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { catchError, of } from 'rxjs';

@Component({
	imports: [ReactiveFormsModule, RouterLink, TuiBadge, TuiButton, TuiIcon, TuiInput, TuiTextfield],
	selector: 'app-admin-page',
	styleUrl: './admin-page.scss',
	templateUrl: './admin-page.html',
})
export default class AdminPage {
	readonly roles = inject(RoleService);
	private readonly catalog = inject(GamesCatalogService);
	private readonly destroyRef = inject(DestroyRef);

	readonly total = signal(0);
	readonly status = signal<ImportStatus | null>(null);
	readonly importing = signal(false);
	readonly result = signal('');
	readonly queryControl = new FormControl('', { nonNullable: true });
	readonly aliases = signal<SearchAlias[]>([]);
	readonly aliasTerm = new FormControl('', { nonNullable: true });
	readonly aliasReplacement = new FormControl('', { nonNullable: true });
	readonly gameAliasQuery = new FormControl('', { nonNullable: true });
	readonly gameAliasResults = signal<Game[]>([]);
	readonly selectedGame = signal<Game | null>(null);
	readonly gameAliases = signal<SearchAlias[]>([]);
	readonly gameAliasTerm = new FormControl('', { nonNullable: true });
	readonly accessSummary = computed(() => {
		const roles = this.roles.roles();

		if (!roles) {
			return [] as Array<{ label: string; value: number }>;
		}

		return [
			{ label: 'Владельцы', value: roles.owners.length },
			{ label: 'Админы', value: roles.admins.length },
			{ label: 'Модераторы', value: roles.moderators.length },
			{ label: 'VIP', value: roles.vips.length },
		];
	});

	constructor() {
		this.loadTotal();
		this.loadStatus();
		this.loadAliases();
	}

	loadAliases(): void {
		this.catalog
			.searchAliases()
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((response) => {
				if (response) {
					this.aliases.set(response.items);
				}
			});
	}

	findGames(): void {
		const query = this.gameAliasQuery.value.trim();

		if (!query) {
			return;
		}

		this.catalog
			.search(query, 6)
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((response) => this.gameAliasResults.set(response?.items ?? []));
	}

	selectGame(game: Game): void {
		this.selectedGame.set(game);
		this.gameAliasResults.set([]);
		this.gameAliasQuery.setValue('');
		this.loadGameAliases();
	}

	loadGameAliases(): void {
		const game = this.selectedGame();

		if (!game) {
			this.gameAliases.set([]);

			return;
		}

		this.catalog
			.searchAliases(game.slug)
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((response) => this.gameAliases.set(response?.items ?? []));
	}

	addGameAlias(): void {
		const game = this.selectedGame();
		const term = this.gameAliasTerm.value.trim();

		if (!game || !term) {
			return;
		}

		this.catalog
			.saveSearchAlias(term, '', game.slug)
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => {
				this.gameAliasTerm.setValue('');
				this.loadGameAliases();
			});
	}

	removeGameAlias(term: string): void {
		const game = this.selectedGame();

		if (!game) {
			return;
		}

		this.catalog
			.deleteSearchAlias(term, game.slug)
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => this.loadGameAliases());
	}

	addAlias(): void {
		const term = this.aliasTerm.value.trim();
		const replacement = this.aliasReplacement.value.trim();

		if (!term || !replacement) {
			return;
		}

		this.catalog
			.saveSearchAlias(term, replacement)
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => {
				this.aliasTerm.setValue('');
				this.aliasReplacement.setValue('');
				this.loadAliases();
			});
	}

	removeAlias(term: string): void {
		this.catalog
			.deleteSearchAlias(term)
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => this.loadAliases());
	}

	loadStatus(): void {
		this.catalog
			.importStatus()
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((status) => {
				if (status) {
					this.status.set(status);
					this.total.set(status.total);
				}
			});
	}

	resumeRawg(): void {
		this.catalog
			.resumeRawg()
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => this.loadStatus());
	}

	roleLabel(): string {
		const labels: Record<AccessRole, string> = {
			owner: 'Владелец',
			admin: 'Админ',
			moderator: 'Модератор',
			vip: 'VIP',
			viewer: 'Зритель',
		};

		return labels[this.roles.role()];
	}

	importByName(): void {
		const query = this.queryControl.value.trim();

		if (!query || this.importing()) {
			return;
		}

		this.importing.set(true);
		this.result.set('');

		this.catalog
			.importSearch(query)
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((response) => {
				this.importing.set(false);
				this.result.set(
					response
						? `Добавлено: ${response.imported}, пропущено: ${response.skipped}`
						: 'Не удалось выполнить импорт',
				);

				if (response?.imported) {
					this.loadTotal();
				}
			});
	}

	refreshCatalog(): void {
		this.importing.set(true);
		this.catalog
			.refreshCatalog()
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((response) => {
				this.importing.set(false);
				this.result.set(
					response ? `Каталог обновлён: ${response.total} игр` : 'Не удалось обновить каталог',
				);

				if (response) {
					this.total.set(response.total);
				}
			});
	}

	private loadTotal(): void {
		this.catalog
			.list({ pageSize: 1 })
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((response) => {
				if (response) {
					this.total.set(response.total);
				}
			});
	}
}
