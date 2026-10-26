import type { Game } from '@shared/types/game';
import type { SearchAlias } from '@shared/services/games-catalog.service';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { GamesCatalogService } from '@shared/services/games-catalog.service';
import { TuiButton, TuiIcon, TuiInput, TuiTextfield } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { catchError, of } from 'rxjs';

@Component({
	imports: [ReactiveFormsModule, TuiBadge, TuiButton, TuiIcon, TuiInput, TuiTextfield],
	selector: 'app-admin-synonyms',
	template: `
		<div class="admin-page">
			<header class="admin-page-head">
				<div>
					<h1>Синонимы поиска</h1>
					<p class="jk-caption">Глобальные замены и дополнительные названия для конкретных игр.</p>
				</div>
				<span appearance="info" tuiBadge>{{ globals().length }} глобальных</span>
			</header>

			<section class="admin-card">
				<div class="admin-card-head">
					<h2>Глобальные</h2>
					<span class="jk-caption">Запрос → замена</span>
				</div>
				<form class="admin-search" (submit)="$event.preventDefault(); addGlobal()">
					<tui-textfield><input placeholder="мортал" [formControl]="term" tuiInput /></tui-textfield>
					<tui-textfield><input placeholder="mortal" [formControl]="replacement" tuiInput /></tui-textfield>
					<button appearance="primary" type="submit" tuiButton>Добавить</button>
				</form>
				@if (globals().length) {
					<ul class="admin-list">
						@for (item of globals(); track item.term) {
							<li class="admin-list-row">
								<strong>{{ item.term }} <span class="jk-caption">→ {{ item.replacement }}</span></strong>
								<button appearance="flat" size="s" type="button" (click)="removeGlobal(item.term)" tuiButton>Удалить</button>
							</li>
						}
					</ul>
				} @else {
					<div class="admin-empty">
						<tui-icon icon="@tui.search" />
						<span class="jk-caption">Глобальных синонимов пока нет.</span>
					</div>
				}
			</section>

			<section class="admin-card">
				<div class="admin-card-head">
					<h2>Для игры</h2>
					@if (selected(); as game) {
						<span appearance="info" tuiBadge>{{ game.title }}</span>
					}
				</div>
				<form class="admin-search" (submit)="$event.preventDefault(); findGames()">
					<tui-textfield>
						<tui-icon icon="@tui.search" />
						<input placeholder="Название игры" [formControl]="gameQuery" tuiInput />
					</tui-textfield>
					<button appearance="primary" type="submit" tuiButton>Найти</button>
				</form>

				@if (results().length) {
					<div class="admin-table-actions">
						@for (game of results(); track game.slug) {
							<button appearance="flat" size="s" type="button" (click)="selectGame(game)" tuiButton>{{ game.title }}</button>
						}
					</div>
				}

				@if (selected(); as game) {
					<div class="admin-selected-game">
						<span class="jk-label">Выбрана игра</span>
						<strong>{{ game.title }}</strong>
					</div>
					<form class="admin-search" (submit)="$event.preventDefault(); addGame()">
						<tui-textfield><input placeholder="мортал шелл 2" [formControl]="gameTerm" tuiInput /></tui-textfield>
						<button appearance="primary" type="submit" tuiButton>Добавить</button>
					</form>
					@if (gameAliases().length) {
						<ul class="admin-list">
							@for (item of gameAliases(); track item.term) {
								<li class="admin-list-row">
									<strong>{{ item.term }}</strong>
									<button appearance="flat" size="s" type="button" (click)="removeGame(item.term)" tuiButton>Удалить</button>
								</li>
							}
						</ul>
					} @else {
						<div class="admin-empty">
							<tui-icon icon="@tui.tags" />
							<span class="jk-caption">У игры пока нет дополнительных названий.</span>
						</div>
					}
				}
			</section>
		</div>
	`,
})
export class SynonymsPage {
	private readonly catalog = inject(GamesCatalogService);
	private readonly destroyRef = inject(DestroyRef);
	readonly term = new FormControl('', { nonNullable: true });
	readonly replacement = new FormControl('', { nonNullable: true });
	readonly gameQuery = new FormControl('', { nonNullable: true });
	readonly gameTerm = new FormControl('', { nonNullable: true });
	readonly globals = signal<SearchAlias[]>([]);
	readonly results = signal<Game[]>([]);
	readonly selected = signal<Game | null>(null);
	readonly gameAliases = signal<SearchAlias[]>([]);

	constructor() {
		this.loadGlobals();
	}

	loadGlobals(): void {
		this.catalog
			.searchAliases()
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((response) => this.globals.set(response?.items ?? []));
	}

	addGlobal(): void {
		const term = this.term.value.trim();
		const replacement = this.replacement.value.trim();

		if (!term || !replacement) {
			return;
		}

		this.catalog
			.saveSearchAlias(term, replacement)
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.term.setValue('');
				this.replacement.setValue('');
				this.loadGlobals();
			});
	}

	removeGlobal(term: string): void {
		this.catalog
			.deleteSearchAlias(term)
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.loadGlobals());
	}

	findGames(): void {
		const value = this.gameQuery.value.trim();

		if (!value) {
			return;
		}

		this.catalog
			.search(value, 12)
			.pipe(catchError(() => of({ items: [] })), takeUntilDestroyed(this.destroyRef))
			.subscribe((response) => this.results.set(response.items));
	}

	selectGame(game: Game): void {
		this.selected.set(game);
		this.results.set([]);
		this.gameQuery.setValue('');
		this.loadGameAliases();
	}

	loadGameAliases(): void {
		const game = this.selected();

		if (!game) {
			return;
		}

		this.catalog
			.searchAliases(game.slug)
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((response) => this.gameAliases.set(response?.items ?? []));
	}

	addGame(): void {
		const game = this.selected();
		const term = this.gameTerm.value.trim();

		if (!game || !term) {
			return;
		}

		this.catalog
			.saveSearchAlias(term, '', game.slug)
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.gameTerm.setValue('');
				this.loadGameAliases();
			});
	}

	removeGame(term: string): void {
		const game = this.selected();

		if (!game) {
			return;
		}

		this.catalog
			.deleteSearchAlias(term, game.slug)
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.loadGameAliases());
	}
}
