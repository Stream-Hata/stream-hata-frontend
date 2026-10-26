import type { Game } from '@shared/types/game';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GamesCatalogService } from '@shared/services/games-catalog.service';
import { TuiButton, TuiIcon, TuiInput, TuiLink, TuiTextfield } from '@taiga-ui/core';
import { TuiBadge, TuiSwitch, TuiTextarea } from '@taiga-ui/kit';
import { catchError, of } from 'rxjs';

function split(value: string): string[] {
	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function join(value?: string[]): string {
	return (value ?? []).join(', ');
}

@Component({
	imports: [ReactiveFormsModule, RouterLink, TuiBadge, TuiButton, TuiIcon, TuiInput, TuiLink, TuiSwitch, TuiTextarea, TuiTextfield],
	selector: 'app-admin-game-edit',
	template: `
		<div class="admin-page game-detail-page">
			<header class="admin-page-head">
				<div>
					<a appearance="flat" routerLink="/games" tuiButton>← К списку игр</a>
					<h1>{{ game()?.title || 'Игра' }}</h1>
					<p class="jk-caption">Slug: {{ game()?.slug }} · ID: {{ game()?.id }}</p>
				</div>
				<div class="admin-table-actions">
					@if (game(); as current) {
						<a appearance="flat" [href]="'https://streamhata.rdpctd.dev/app/games/' + current.slug" target="_blank" rel="noopener" tuiButton>
							<tui-icon icon="@tui.external-link" />
							Открыть в StreamHata
						</a>
					}
					@if (saved()) {
						<span [class.admin-error]="!savedOk()" [class.admin-success]="savedOk()">{{ saved() }}</span>
					}
				</div>
			</header>

			@if (loading()) {
				<div class="admin-card admin-empty">Загружаем игру…</div>
			} @else if (game(); as current) {
				<div class="game-detail">
					<aside class="game-detail-cover-card">
						@if (current.cover) {
							<img class="game-detail-cover" [alt]="current.title" [src]="current.cover" />
						} @else {
							<div class="game-detail-cover game-detail-cover-empty">{{ initials(current.title) }}</div>
						}
						<div class="game-detail-badges">
							<span class="game-chip" [class]="'game-chip-' + current.tier">{{ tierLabel(current.tier) }}</span>
							<span class="game-chip">{{ ageLabel(current.age) }}</span>
							<span class="game-chip" [class]="'game-chip-status-' + current.status">{{ statusLabel(current.status) }}</span>
						</div>
						<div class="game-detail-cover-meta">
							<span class="jk-label">Рейтинг</span>
							<strong class="jk-metric">{{ current.rating ?? current.aggregatedRating ?? '—' }}</strong>
							@if (current.website) {
								<a [href]="current.website" target="_blank" rel="noopener" tuiLink>Сайт игры</a>
							}
						</div>
					</aside>

					<div class="game-detail-info">
						<section class="admin-card">
							<div class="admin-card-head"><h2>Основное</h2></div>
							@for (field of basicFields(); track field.key) {
								<div class="detail-row">
									<span class="jk-label">{{ field.label }}</span>
									@if (editing() === field.key) {
										<div class="detail-edit">
											<tui-textfield>
												<input [formControl]="draft" [placeholder]="field.label" tuiInput />
											</tui-textfield>
											<button appearance="primary" size="s" type="button" (click)="saveField(field.key)" tuiButton>Сохранить</button>
											<button appearance="flat" size="s" type="button" (click)="cancel()" tuiButton>Отмена</button>
										</div>
									} @else {
										<span class="detail-value">{{ field.value || '—' }}</span>
										<button appearance="flat" size="s" type="button" (click)="begin(field.key, field.value)" tuiButton>
											<tui-icon icon="@tui.pencil" /> Изменить
										</button>
									}
								</div>
							}
						</section>

						<section class="admin-card">
							<div class="admin-card-head"><h2>Жанры и теги</h2></div>
							@for (field of tagFields(); track field.key) {
								<div class="detail-row">
									<span class="jk-label">{{ field.label }}</span>
									@if (editing() === field.key) {
										<div class="detail-edit">
											<tui-textfield><input [formControl]="draft" [placeholder]="field.label" tuiInput /></tui-textfield>
											<button appearance="primary" size="s" type="button" (click)="saveField(field.key)" tuiButton>Сохранить</button>
											<button appearance="flat" size="s" type="button" (click)="cancel()" tuiButton>Отмена</button>
										</div>
									} @else {
										<div class="detail-chips">
											@for (item of field.items; track item) {
												<span appearance="neutral" tuiBadge>{{ item }}</span>
											} @empty {
												<span class="detail-value">—</span>
											}
										</div>
										<button appearance="flat" size="s" type="button" (click)="begin(field.key, field.value)" tuiButton>
											<tui-icon icon="@tui.pencil" /> Изменить
										</button>
									}
								</div>
							}
						</section>

						<section class="admin-card">
							<div class="admin-card-head"><h2>Описание</h2></div>
							@if (editing() === 'description') {
								<tui-textfield>
									<textarea rows="8" [formControl]="draft" tuiTextarea></textarea>
								</tui-textfield>
								<div class="admin-table-actions">
									<button appearance="primary" size="s" type="button" (click)="saveField('description')" tuiButton>Сохранить</button>
									<button appearance="flat" size="s" type="button" (click)="cancel()" tuiButton>Отмена</button>
								</div>
							} @else {
								<p class="detail-description">{{ current.description || 'Описание отсутствует' }}</p>
								<button appearance="flat" size="s" type="button" (click)="begin('description', current.description ?? '')" tuiButton>
									<tui-icon icon="@tui.pencil" /> Изменить
								</button>
							}
						</section>

						<section class="admin-card">
							<div class="admin-card-head"><h2>Дополнительно</h2></div>
							<div class="detail-row">
								<span class="jk-label">Требуется эмулятор</span>
								<input type="checkbox" [formControl]="emulatorsRequired" (change)="saveEmulators()" tuiSwitch />
							</div>
							@for (field of extraFields(); track field.key) {
								<div class="detail-row">
									<span class="jk-label">{{ field.label }}</span>
									@if (editing() === field.key) {
										<div class="detail-edit">
											<tui-textfield>
												<textarea rows="5" [formControl]="draft" tuiTextarea></textarea>
											</tui-textfield>
											<button appearance="primary" size="s" type="button" (click)="saveJson(field.key)" tuiButton>Сохранить</button>
											<button appearance="flat" size="s" type="button" (click)="cancel()" tuiButton>Отмена</button>
										</div>
									} @else {
										<span class="detail-value">{{ field.count }} элем.</span>
										<button appearance="flat" size="s" type="button" (click)="begin(field.key, field.value)" tuiButton>
											<tui-icon icon="@tui.pencil" /> Изменить JSON
										</button>
									}
								</div>
							}
						</section>
					</div>
				</div>
			} @else {
				<div class="admin-card admin-empty">Игра не найдена</div>
			}
		</div>
	`,
})
export class GameEditPage {
	private readonly catalog = inject(GamesCatalogService);
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);
	readonly game = signal<Game | null>(null);
	readonly loading = signal(true);
	readonly editing = signal<string | null>(null);
	readonly draft = new FormControl('', { nonNullable: true });
	readonly emulatorsRequired = new FormControl(false, { nonNullable: true });
	readonly saved = signal('');
	readonly savedOk = signal(true);

	readonly basicFields = () => {
		const game = this.game();

		if (!game) {
			return [];
		}

		return [
			{ key: 'title', label: 'Название', value: game.title },
			{ key: 'titleRu', label: 'Название на русском', value: game.titleRu ?? '' },
			{ key: 'originalTitle', label: 'Оригинальное название', value: game.originalTitle ?? '' },
			{ key: 'year', label: 'Год', value: game.year ? String(game.year) : '' },
			{ key: 'releaseDate', label: 'Дата релиза', value: game.releaseDate ?? '' },
			{ key: 'ageRating', label: 'Возрастной рейтинг', value: game.ageRating ?? '' },
			{ key: 'website', label: 'Сайт', value: game.website ?? '' },
			{ key: 'cover', label: 'Обложка URL', value: game.cover ?? '' },
			{ key: 'tier', label: 'Tier', value: game.tier },
			{ key: 'age', label: 'Возраст', value: game.age },
			{ key: 'status', label: 'Статус', value: game.status },
			{ key: 'rating', label: 'Рейтинг', value: game.rating !== undefined ? String(game.rating) : '' },
			{ key: 'aggregatedRating', label: 'Агрегированный рейтинг', value: game.aggregatedRating !== undefined ? String(game.aggregatedRating) : '' },
			{ key: 'hastilyHours', label: 'Прохождение: быстро', value: game.completion?.hastilyHours !== undefined ? String(game.completion.hastilyHours) : '' },
			{ key: 'normallyHours', label: 'Прохождение: обычно', value: game.completion?.normallyHours !== undefined ? String(game.completion.normallyHours) : '' },
			{ key: 'completelyHours', label: 'Прохождение: полностью', value: game.completion?.completelyHours !== undefined ? String(game.completion.completelyHours) : '' },
		];
	};

	readonly tagFields = () => {
		const game = this.game();

		if (!game) {
			return [];
		}

		return [
			{ key: 'genres', label: 'Жанры', items: game.genres ?? [], value: join(game.genres) },
			{ key: 'genresRu', label: 'Жанры на русском', items: game.genresRu ?? [], value: join(game.genresRu) },
			{ key: 'modes', label: 'Режимы', items: game.modes ?? [], value: join(game.modes) },
			{ key: 'perspectives', label: 'Перспективы', items: game.perspectives ?? [], value: join(game.perspectives) },
			{ key: 'themes', label: 'Темы', items: game.themes ?? [], value: join(game.themes) },
			{ key: 'developers', label: 'Разработчики', items: game.developers ?? [], value: join(game.developers) },
			{ key: 'publishers', label: 'Издатели', items: game.publishers ?? [], value: join(game.publishers) },
			{ key: 'aliases', label: 'Алиасы', items: game.aliases ?? [], value: join(game.aliases) },
			{ key: 'searchTags', label: 'Теги поиска', items: game.searchTags ?? [], value: join(game.searchTags) },
			{ key: 'screenshots', label: 'Скриншоты', items: game.screenshots ?? [], value: join(game.screenshots) },
			{ key: 'dlc', label: 'DLC', items: game.dlc ?? [], value: join(game.dlc) },
			{ key: 'editions', label: 'Издания', items: game.editions ?? [], value: join(game.editions) },
			{ key: 'mods', label: 'Моды', items: game.mods ?? [], value: join(game.mods) },
		];
	};

	readonly extraFields = () => {
		const game = this.game();

		if (!game) {
			return [];
		}

		return [
			{ key: 'platforms', label: 'Платформы', count: game.platforms?.length ?? 0, value: JSON.stringify(game.platforms ?? [], null, 2) },
			{ key: 'emulators', label: 'Эмуляторы', count: game.emulators?.length ?? 0, value: JSON.stringify(game.emulators ?? [], null, 2) },
			{ key: 'downloads', label: 'Загрузки', count: game.downloads?.length ?? 0, value: JSON.stringify(game.downloads ?? [], null, 2) },
			{ key: 'sources', label: 'Источники', count: game.sources?.length ?? 0, value: JSON.stringify(game.sources ?? [], null, 2) },
			{ key: 'popularMods', label: 'Популярные моды', count: game.popularMods?.length ?? 0, value: JSON.stringify(game.popularMods ?? [], null, 2) },
			{ key: 'popularCollections', label: 'Популярные коллекции', count: game.popularCollections?.length ?? 0, value: JSON.stringify(game.popularCollections ?? [], null, 2) },
		];
	};

	constructor() {
		const slug = this.route.snapshot.paramMap.get('slug') ?? '';

		this.catalog
			.get(slug)
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((game) => {
				this.loading.set(false);

				if (game) {
					this.apply(game);
				}
			});
	}

	tierLabel(value: string): string {
		return { none: 'Без тира', gold: 'Gold', diamond: 'Diamond', platinum: 'Platinum' }[value] ?? value;
	}

	ageLabel(value: string): string {
		return { classic: 'Classic', retro: 'Retro', modern: 'Modern', new: 'New' }[value] ?? value;
	}

	statusLabel(value: string): string {
		return { seed: 'В каталоге', pending: 'На проверке', approved: 'Одобрено', rejected: 'Отклонено', merged: 'Объединено' }[value] ?? value;
	}

	initials(title: string): string {
		return title
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0] ?? '')
			.join('')
			.toUpperCase();
	}

	begin(key: string, value: string): void {
		this.editing.set(key);
		this.draft.setValue(value);
	}

	cancel(): void {
		this.editing.set(null);
	}

	saveField(key: string): void {
		const value = this.draft.value.trim();
		const completionKeys = ['hastilyHours', 'normallyHours', 'completelyHours'];

		if (completionKeys.includes(key)) {
			this.patch({
				completion: {
					...this.game()?.completion,
					[key]: value === '' ? undefined : Number(value),
				},
			});

			return;
		}

		this.patch({ [key]: this.fieldValue(key, value) });
	}

	saveJson(key: string): void {
		try {
			this.patch({ [key]: JSON.parse(this.draft.value) });
		} catch {
			this.savedOk.set(false);
			this.saved.set('Ошибка: некорректный JSON');
		}
	}

	saveEmulators(): void {
		this.patch({ emulatorsRequired: this.emulatorsRequired.value });
	}

	private fieldValue(key: string, value: string): unknown {
		if (['year', 'rating', 'aggregatedRating', 'hastilyHours', 'normallyHours', 'completelyHours'].includes(key)) {
			return value === '' ? undefined : Number(value);
		}

		if (['genres', 'genresRu', 'modes', 'perspectives', 'themes', 'developers', 'publishers', 'aliases', 'searchTags', 'screenshots', 'dlc', 'editions', 'mods'].includes(key)) {
			return split(value);
		}

		return value;
	}

	private patch(patch: Partial<Game>): void {
		const game = this.game();

		if (!game) {
			return;
		}

		this.catalog
			.updateGame(game.slug, patch)
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((updated) => {
				if (!updated) {
					this.savedOk.set(false);
					this.saved.set('Ошибка сохранения');

					return;
				}

				this.apply(updated);
				this.savedOk.set(true);
				this.saved.set('Сохранено');
				this.editing.set(null);
			});
	}

	private apply(game: Game): void {
		this.game.set(game);
		this.emulatorsRequired.setValue(game.emulatorsRequired);
		this.saved.set('');
	}
}
