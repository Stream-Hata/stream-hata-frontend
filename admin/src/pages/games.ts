import type { Game, GameAge, GameStatus, GameTier } from '@shared/types/game';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { GamesCatalogService } from '@shared/services/games-catalog.service';
import { TuiButton, TuiDropdown, TuiIcon, TuiInput, TuiSelectLike, TuiTextfield } from '@taiga-ui/core';
import {
	TuiBadge,
	TuiChevron,
	TuiDataListWrapper,
	TuiInputNumber,
	TuiSwitch,
	TuiTextarea,
} from '@taiga-ui/kit';
import { catchError, of } from 'rxjs';

const TIERS: GameTier[] = ['none', 'gold', 'diamond', 'platinum'];
const AGES: GameAge[] = ['classic', 'retro', 'modern', 'new'];
const STATUSES: GameStatus[] = ['seed', 'pending', 'approved', 'rejected', 'merged'];

function list(value: string): string[] {
	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

function lines(value: string): string[] {
	return value
		.split('\n')
		.map((item) => item.trim())
		.filter(Boolean);
}

@Component({
	imports: [
		ReactiveFormsModule,
		RouterLink,
		TuiBadge,
		TuiButton,
		TuiChevron,
		TuiDropdown,
		TuiDataListWrapper,
		TuiIcon,
		TuiInput,
		TuiInputNumber,
		TuiSelectLike,
		TuiSwitch,
		TuiTextarea,
		TuiTextfield,
	],
	selector: 'app-admin-games',
	template: `
		<div class="admin-page">
			<header class="admin-page-head">
				<div>
					<h1>Игры</h1>
					<p class="jk-caption">Поиск, полное редактирование и удаление карточек каталога.</p>
				</div>
				<span appearance="info" tuiBadge>{{ total() }} игр</span>
			</header>

			<section class="admin-card">
				<form class="admin-search" (submit)="$event.preventDefault(); search()">
					<tui-textfield>
						<tui-icon icon="@tui.search" />
						<input placeholder="Название игры или slug" [formControl]="query" tuiInput />
					</tui-textfield>
					<button appearance="primary" type="submit" tuiButton>Найти</button>
					<button appearance="flat" type="button" (click)="resetSearch()" tuiButton>Сбросить</button>
				</form>
			</section>

			<section class="admin-card">
				@if (items().length) {
					<table class="admin-table">
						<thead>
							<tr><th>Игра</th><th>Год</th><th>Tier</th><th>Slug</th><th></th></tr>
						</thead>
						<tbody>
							@for (game of items(); track game.slug) {
								<tr>
									<td>
										<div class="admin-game-cell">
											@if (game.cover) {
												<img class="admin-cover" [alt]="game.title" [src]="game.cover" />
											} @else {
												<span class="admin-cover admin-cover-empty">{{ initials(game.title) }}</span>
											}
											<strong>{{ game.title }}</strong>
										</div>
									</td>
									<td>{{ game.year || '—' }}</td>
									<td><span appearance="neutral" tuiBadge>{{ game.tier }}</span></td>
									<td class="jk-caption">{{ game.slug }}</td>
									<td>
										<div class="admin-table-actions">
											<a appearance="flat" size="s" [routerLink]="['/games', game.slug]" tuiButton>Изменить</a>
											<a
												appearance="flat"
												size="s"
												[href]="'https://streamhata.rdpctd.dev/app/games/' + game.slug"
												target="_blank"
												rel="noopener"
												tuiButton
											>Открыть</a>
											<button appearance="flat" size="s" type="button" (click)="remove(game)" tuiButton>Удалить</button>
										</div>
									</td>
								</tr>
							}
						</tbody>
					</table>
					<div class="admin-pagination">
						<button appearance="flat" size="s" type="button" [disabled]="page() <= 1" (click)="load(page() - 1)" tuiButton>Назад</button>
						<span class="jk-caption">Страница {{ page() }} из {{ pages() }}</span>
						<button appearance="flat" size="s" type="button" [disabled]="page() >= pages()" (click)="load(page() + 1)" tuiButton>Вперёд</button>
					</div>
				} @else {
					<div class="admin-empty">
						<tui-icon icon="@tui.gamepad-2" />
						<span class="jk-h4">Игры не найдены</span>
						<span class="jk-caption">Измени запрос или загрузи каталог в разделе «Импорт».</span>
					</div>
				}
			</section>

			@if (selected(); as game) {
				<section class="admin-card">
					<div class="admin-card-head">
						<div>
							<h2>Редактирование: {{ game.title }}</h2>
							<span class="jk-caption">Slug: {{ game.slug }} · ID: {{ game.id }}</span>
						</div>
						<button appearance="flat" size="s" type="button" (click)="selected.set(null)" tuiButton>Закрыть</button>
					</div>

					<span class="jk-label">Основное</span>
					<div class="admin-form">
						<tui-textfield><input placeholder="Название" [formControl]="title" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Название на русском" [formControl]="titleRu" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Оригинальное название" [formControl]="originalTitle" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Год" [formControl]="year" tuiInputNumber /></tui-textfield>
						<tui-textfield><input placeholder="Дата релиза" [formControl]="releaseDate" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Возрастной рейтинг" [formControl]="ageRating" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Сайт" [formControl]="website" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Обложка URL" [formControl]="cover" tuiInput /></tui-textfield>
					</div>

					<span class="jk-label">Классификация</span>
					<div class="admin-form">
						<tui-textfield tuiChevron>
							<input aria-label="Tier" [readonly]="true" [value]="tierText()" tuiInput tuiSelectLike />
							<tui-data-list-wrapper *tuiDropdown [items]="tierLabels" (itemClick)="setTier($event)" />
						</tui-textfield>
						<tui-textfield tuiChevron>
							<input aria-label="Возраст" [readonly]="true" [value]="ageText()" tuiInput tuiSelectLike />
							<tui-data-list-wrapper *tuiDropdown [items]="ageLabels" (itemClick)="setAge($event)" />
						</tui-textfield>
						<tui-textfield tuiChevron>
							<input aria-label="Статус" [readonly]="true" [value]="statusText()" tuiInput tuiSelectLike />
							<tui-data-list-wrapper *tuiDropdown [items]="statusLabels" (itemClick)="setStatus($event)" />
						</tui-textfield>
						<label class="admin-switch">
							<input type="checkbox" [formControl]="emulatorsRequired" tuiSwitch />
							<span>Требуется эмулятор</span>
						</label>
					</div>

					<span class="jk-label">Жанры и теги</span>
					<div class="admin-form">
						<tui-textfield><input placeholder="Жанры" [formControl]="genres" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Жанры на русском" [formControl]="genresRu" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Режимы" [formControl]="modes" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Перспективы" [formControl]="perspectives" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Темы" [formControl]="themes" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Разработчики" [formControl]="developers" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Издатели" [formControl]="publishers" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Алиасы" [formControl]="aliases" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Теги поиска" [formControl]="searchTags" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Скриншоты (URL через запятую)" [formControl]="screenshots" tuiInput /></tui-textfield>
					</div>

					<span class="jk-label">Рейтинги и прохождение</span>
					<div class="admin-form">
						<tui-textfield><input placeholder="Рейтинг" [formControl]="rating" tuiInputNumber /></tui-textfield>
						<tui-textfield><input placeholder="Агрегированный рейтинг" [formControl]="aggregatedRating" tuiInputNumber /></tui-textfield>
						<tui-textfield><input placeholder="Часов: быстро" [formControl]="hastilyHours" tuiInputNumber /></tui-textfield>
						<tui-textfield><input placeholder="Часов: обычно" [formControl]="normallyHours" tuiInputNumber /></tui-textfield>
						<tui-textfield><input placeholder="Часов: полностью" [formControl]="completelyHours" tuiInputNumber /></tui-textfield>
					</div>

					<span class="jk-label">Описание</span>
					<tui-textfield>
						<textarea rows="8" placeholder="Описание игры" [formControl]="description" tuiTextarea></textarea>
					</tui-textfield>

					<span class="jk-label">Дополнительно</span>
					<div class="admin-form">
						<tui-textfield><input placeholder="DLC через запятую" [formControl]="dlc" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Издания через запятую" [formControl]="editions" tuiInput /></tui-textfield>
						<tui-textfield><input placeholder="Моды через запятую" [formControl]="mods" tuiInput /></tui-textfield>
					</div>

					<span class="jk-label">JSON-поля</span>
					<div class="admin-json-grid">
						<tui-textfield>
							<textarea rows="5" placeholder="platforms: []" [formControl]="platformsJson" tuiTextarea></textarea>
						</tui-textfield>
						<tui-textfield>
							<textarea rows="5" placeholder="emulators: []" [formControl]="emulatorsJson" tuiTextarea></textarea>
						</tui-textfield>
						<tui-textfield>
							<textarea rows="5" placeholder="downloads: []" [formControl]="downloadsJson" tuiTextarea></textarea>
						</tui-textfield>
						<tui-textfield>
							<textarea rows="5" placeholder="sources: []" [formControl]="sourcesJson" tuiTextarea></textarea>
						</tui-textfield>
						<tui-textfield>
							<textarea rows="5" placeholder="popularMods: []" [formControl]="popularModsJson" tuiTextarea></textarea>
						</tui-textfield>
						<tui-textfield>
							<textarea rows="5" placeholder="popularCollections: []" [formControl]="popularCollectionsJson" tuiTextarea></textarea>
						</tui-textfield>
					</div>

					<div class="admin-card-head">
						<button appearance="primary" type="button" (click)="save()" tuiButton>Сохранить</button>
						@if (saved()) {
							<span [class.admin-error]="!savedOk()" [class.admin-success]="savedOk()">{{ saved() }}</span>
						}
					</div>
				</section>
			}
		</div>
	`,
})
export class GamesAdminPage {
	private readonly catalog = inject(GamesCatalogService);
	private readonly destroyRef = inject(DestroyRef);
	readonly query = new FormControl('', { nonNullable: true });
	readonly items = signal<Game[]>([]);
	readonly selected = signal<Game | null>(null);
	readonly title = new FormControl('', { nonNullable: true });
	readonly titleRu = new FormControl('', { nonNullable: true });
	readonly originalTitle = new FormControl('', { nonNullable: true });
	readonly year = new FormControl<number | null>(null);
	readonly releaseDate = new FormControl('', { nonNullable: true });
	readonly ageRating = new FormControl('', { nonNullable: true });
	readonly website = new FormControl('', { nonNullable: true });
	readonly cover = new FormControl('', { nonNullable: true });
	readonly genres = new FormControl('', { nonNullable: true });
	readonly genresRu = new FormControl('', { nonNullable: true });
	readonly modes = new FormControl('', { nonNullable: true });
	readonly perspectives = new FormControl('', { nonNullable: true });
	readonly themes = new FormControl('', { nonNullable: true });
	readonly developers = new FormControl('', { nonNullable: true });
	readonly publishers = new FormControl('', { nonNullable: true });
	readonly aliases = new FormControl('', { nonNullable: true });
	readonly searchTags = new FormControl('', { nonNullable: true });
	readonly screenshots = new FormControl('', { nonNullable: true });
	readonly rating = new FormControl<number | null>(null);
	readonly aggregatedRating = new FormControl<number | null>(null);
	readonly hastilyHours = new FormControl<number | null>(null);
	readonly normallyHours = new FormControl<number | null>(null);
	readonly completelyHours = new FormControl<number | null>(null);
	readonly description = new FormControl('', { nonNullable: true });
	readonly dlc = new FormControl('', { nonNullable: true });
	readonly editions = new FormControl('', { nonNullable: true });
	readonly mods = new FormControl('', { nonNullable: true });
	readonly platformsJson = new FormControl('[]', { nonNullable: true });
	readonly emulatorsJson = new FormControl('[]', { nonNullable: true });
	readonly downloadsJson = new FormControl('[]', { nonNullable: true });
	readonly sourcesJson = new FormControl('[]', { nonNullable: true });
	readonly popularModsJson = new FormControl('[]', { nonNullable: true });
	readonly popularCollectionsJson = new FormControl('[]', { nonNullable: true });
	readonly emulatorsRequired = new FormControl(false, { nonNullable: true });
	readonly saved = signal('');
	readonly savedOk = signal(true);
	readonly total = signal(0);
	readonly page = signal(1);
	readonly pageSize = 50;
	readonly tierLabels = ['none', 'gold', 'diamond', 'platinum'];
	readonly ageLabels = ['classic', 'retro', 'modern', 'new'];
	readonly statusLabels = ['seed', 'pending', 'approved', 'rejected', 'merged'];
	readonly tierText = signal('none');
	readonly ageText = signal('classic');
	readonly statusText = signal('seed');

	constructor() {
		this.load(1);
	}

	readonly pages = () => Math.max(1, Math.ceil(this.total() / this.pageSize));

	load(page: number): void {
		this.catalog
			.list({ q: this.query.value.trim(), page, pageSize: this.pageSize, facets: false, enrich: false })
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((response) => {
				if (!response) {
					return;
				}

				this.items.set(response.items);
				this.total.set(response.total);
				this.page.set(response.page);
			});
	}

	search(): void {
		this.load(1);
	}

	resetSearch(): void {
		this.query.setValue('');
		this.load(1);
	}

	initials(title: string): string {
		return title
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0] ?? '')
			.join('')
			.toUpperCase();
	}

	setTier(label: string): void {
		this.tierText.set(label);
	}

	setAge(label: string): void {
		this.ageText.set(label);
	}

	setStatus(label: string): void {
		this.statusText.set(label);
	}

	edit(game: Game): void {
		this.selected.set(game);
		this.title.setValue(game.title);
		this.titleRu.setValue(game.titleRu ?? '');
		this.originalTitle.setValue(game.originalTitle ?? '');
		this.year.setValue(game.year ?? null);
		this.releaseDate.setValue(game.releaseDate ?? '');
		this.ageRating.setValue(game.ageRating ?? '');
		this.website.setValue(game.website ?? '');
		this.cover.setValue(game.cover ?? '');
		this.genres.setValue((game.genres ?? []).join(', '));
		this.genresRu.setValue((game.genresRu ?? []).join(', '));
		this.modes.setValue((game.modes ?? []).join(', '));
		this.perspectives.setValue((game.perspectives ?? []).join(', '));
		this.themes.setValue((game.themes ?? []).join(', '));
		this.developers.setValue((game.developers ?? []).join(', '));
		this.publishers.setValue((game.publishers ?? []).join(', '));
		this.aliases.setValue((game.aliases ?? []).join(', '));
		this.searchTags.setValue((game.searchTags ?? []).join(', '));
		this.screenshots.setValue((game.screenshots ?? []).join(', '));
		this.rating.setValue(game.rating ?? null);
		this.aggregatedRating.setValue(game.aggregatedRating ?? null);
		this.hastilyHours.setValue(game.completion?.hastilyHours ?? null);
		this.normallyHours.setValue(game.completion?.normallyHours ?? null);
		this.completelyHours.setValue(game.completion?.completelyHours ?? null);
		this.description.setValue(game.description ?? '');
		this.dlc.setValue((game.dlc ?? []).join(', '));
		this.editions.setValue((game.editions ?? []).join(', '));
		this.mods.setValue((game.mods ?? []).join(', '));
		this.platformsJson.setValue(JSON.stringify(game.platforms ?? [], null, 2));
		this.emulatorsJson.setValue(JSON.stringify(game.emulators ?? [], null, 2));
		this.downloadsJson.setValue(JSON.stringify(game.downloads ?? [], null, 2));
		this.sourcesJson.setValue(JSON.stringify(game.sources ?? [], null, 2));
		this.popularModsJson.setValue(JSON.stringify(game.popularMods ?? [], null, 2));
		this.popularCollectionsJson.setValue(JSON.stringify(game.popularCollections ?? [], null, 2));
		this.emulatorsRequired.setValue(game.emulatorsRequired);
		this.tierText.set(game.tier);
		this.ageText.set(game.age);
		this.statusText.set(game.status);
		this.saved.set('');
	}

	save(): void {
		const game = this.selected();

		if (!game) {
			return;
		}

		const advanced = this.parseAdvanced();

		if (!advanced) {
			this.savedOk.set(false);
			this.saved.set('Ошибка: проверь JSON-поля');

			return;
		}

		const patch: Partial<Game> = {
			title: this.title.value.trim() || game.title,
			titleRu: this.titleRu.value.trim() || undefined,
			originalTitle: this.originalTitle.value.trim() || undefined,
			year: this.year.value ?? undefined,
			releaseDate: this.releaseDate.value.trim() || undefined,
			ageRating: this.ageRating.value.trim() || undefined,
			website: this.website.value.trim() || undefined,
			cover: this.cover.value.trim(),
			genres: list(this.genres.value),
			genresRu: list(this.genresRu.value),
			modes: list(this.modes.value),
			perspectives: list(this.perspectives.value),
			themes: list(this.themes.value),
			developers: list(this.developers.value),
			publishers: list(this.publishers.value),
			aliases: list(this.aliases.value),
			searchTags: list(this.searchTags.value),
			screenshots: list(this.screenshots.value),
			rating: this.rating.value ?? undefined,
			aggregatedRating: this.aggregatedRating.value ?? undefined,
			description: this.description.value.trim(),
			dlc: list(this.dlc.value),
			editions: list(this.editions.value),
			mods: list(this.mods.value),
			completion: {
				hastilyHours: this.hastilyHours.value ?? undefined,
				normallyHours: this.normallyHours.value ?? undefined,
				completelyHours: this.completelyHours.value ?? undefined,
			},
			emulatorsRequired: this.emulatorsRequired.value,
			tier: this.tierText() as GameTier,
			age: this.ageText() as GameAge,
			status: this.statusText() as GameStatus,
			...advanced,
		};

		this.catalog
			.updateGame(game.slug, patch)
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((updated) => {
				if (!updated) {
					this.savedOk.set(false);
					this.saved.set('Ошибка сохранения');

					return;
				}

				this.savedOk.set(true);
				this.selected.set(updated);
				this.saved.set('Сохранено');
				this.items.update((items) => items.map((item) => (item.slug === updated.slug ? updated : item)));
			});
	}

	private parseAdvanced(): Partial<Game> | null {
		try {
			return {
				platforms: JSON.parse(this.platformsJson.value) as Game['platforms'],
				emulators: JSON.parse(this.emulatorsJson.value) as Game['emulators'],
				downloads: JSON.parse(this.downloadsJson.value) as Game['downloads'],
				sources: JSON.parse(this.sourcesJson.value) as Game['sources'],
				popularMods: JSON.parse(this.popularModsJson.value) as Game['popularMods'],
				popularCollections: JSON.parse(this.popularCollectionsJson.value) as Game['popularCollections'],
			};
		} catch {
			return null;
		}
	}

	remove(game: Game): void {
		this.catalog
			.deleteGame(game.slug)
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((result) => {
				if (!result?.deleted) {
					this.savedOk.set(false);
					this.saved.set('Не удалось удалить игру');

					return;
				}

				this.items.update((items) => items.filter((item) => item.slug !== game.slug));
				this.total.update((total) => Math.max(0, total - 1));
				if (this.selected()?.slug === game.slug) {
					this.selected.set(null);
				}
			});
	}
}
