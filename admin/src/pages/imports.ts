import type { Game } from '@shared/types/game';
import { Component, DestroyRef, inject, signal } from '@angular/core';
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
} from '@taiga-ui/kit';
import { catchError, of } from 'rxjs';

@Component({
	imports: [
		ReactiveFormsModule,
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
		TuiTextfield,
	],
	selector: 'app-admin-imports',
	template: `
		<div class="admin-page">
			<header class="admin-page-head">
				<div>
					<h1>Импорт</h1>
					<p class="jk-caption">Загрузка каталога из RAWG и IGDB, точечное добавление и обновление.</p>
				</div>
				@if (busy()) {
					<span appearance="info" tuiBadge>Идёт импорт…</span>
				}
			</header>

			<section class="admin-card">
				<div class="admin-card-head">
					<h2>Импорт из сервиса</h2>
					<span class="jk-caption">Настройте выборку и запустите загрузку</span>
				</div>
				<div class="import-fields">
					<label class="import-field">
						<span class="jk-label">Источник</span>
						<tui-textfield tuiChevron>
							<input aria-label="Источник" [readonly]="true" [value]="sourceLabel()" tuiInput tuiSelectLike />
							<tui-data-list-wrapper *tuiDropdown [items]="sourceLabels" (itemClick)="setSource($event)" />
						</tui-textfield>
					</label>
					<label class="import-field">
						<span class="jk-label">Сортировка</span>
						<tui-textfield tuiChevron>
							<input aria-label="Порядок" [readonly]="true" [value]="orderLabel()" tuiInput tuiSelectLike />
							<tui-data-list-wrapper *tuiDropdown [items]="orderLabels" (itemClick)="setOrder($event)" />
						</tui-textfield>
					</label>
					<label class="import-field">
						<span class="jk-label">Сколько игр загрузить</span>
						<tui-textfield><input aria-label="Лимит" [formControl]="limit" tuiInputNumber /></tui-textfield>
					</label>
					<label class="import-field">
						<span class="jk-label">Минимальный рейтинг</span>
						<tui-textfield><input aria-label="Мин. рейтинг" [formControl]="minRating" tuiInputNumber /></tui-textfield>
					</label>
					<label class="import-field">
						<span class="jk-label">Год выпуска от</span>
						<tui-textfield tuiChevron>
							<input aria-label="Год от" [readonly]="true" [value]="yearFromLabel()" tuiInput tuiSelectLike />
							<tui-data-list-wrapper *tuiDropdown [items]="yearLabels" (itemClick)="setYearFrom($event)" />
						</tui-textfield>
					</label>
					<label class="import-field">
						<span class="jk-label">Год выпуска до</span>
						<tui-textfield tuiChevron>
							<input aria-label="Год до" [readonly]="true" [value]="yearToLabel()" tuiInput tuiSelectLike />
							<tui-data-list-wrapper *tuiDropdown [items]="yearLabels" (itemClick)="setYearTo($event)" />
						</tui-textfield>
					</label>
				</div>
				<label class="admin-switch">
					<input type="checkbox" [formControl]="onlyMissing" tuiSwitch />
					<span>Только отсутствующие</span>
				</label>
				<div class="admin-card-head">
					<button appearance="primary" type="button" [disabled]="busy()" (click)="startImport()" tuiButton>
						{{ busy() ? 'Импортируем…' : 'Импортировать' }}
					</button>
					@if (importResult()) { <span class="admin-success">{{ importResult() }}</span> }
				</div>
			</section>

			<section class="admin-card">
				<div class="admin-card-head">
					<h2>Добавить по названию</h2>
					<span class="jk-caption">IGDB ищет и добавляет игру сразу в каталог</span>
				</div>
				<form class="admin-search" (submit)="$event.preventDefault(); run()">
					<tui-textfield tuiChevron>
						<input aria-label="Источник поиска" [readonly]="true" [value]="searchSourceLabel()" tuiInput tuiSelectLike />
						<tui-data-list-wrapper *tuiDropdown [items]="searchSourceLabels" (itemClick)="setSearchSource($event)" />
					</tui-textfield>
					<tui-textfield>
						<tui-icon icon="@tui.search" />
						<input placeholder="The Elder Scrolls: Arena" [formControl]="query" tuiInput />
					</tui-textfield>
					<button appearance="primary" type="submit" [disabled]="busy()" tuiButton>
						{{ busy() ? 'Ищем…' : 'Импортировать' }}
					</button>
				</form>
				@if (result()) { <span class="admin-success">{{ result() }}</span> }
			</section>

			@if (previewItems().length) {
				<section class="admin-card">
					<div class="admin-card-head">
						<h2>Полученные игры</h2>
						<span class="jk-caption">{{ previewItems().length }} найдено через API</span>
					</div>
					<table class="admin-table">
						<thead><tr><th>Игра</th><th>Год</th><th>Платформы</th><th>Slug</th></tr></thead>
						<tbody>
							@for (game of previewItems(); track game.slug) {
								<tr>
									<td><strong>{{ game.title }}</strong></td>
									<td>{{ game.year || '—' }}</td>
									<td>{{ game.platforms?.[0]?.name || '—' }}</td>
									<td class="jk-caption">{{ game.slug }}</td>
								</tr>
							}
						</tbody>
					</table>
				</section>
			}

			<section class="admin-card">
				<div class="admin-card-head">
					<h2>Обновить каталог</h2>
					<span class="jk-caption">Пересобрать search_text и связанные данные</span>
				</div>
				<div class="admin-card-head">
					<button appearance="secondary" type="button" (click)="refresh()" tuiButton>Обновить</button>
					@if (refreshResult()) { <span class="admin-success">{{ refreshResult() }}</span> }
				</div>
			</section>
		</div>
	`,
})
export class ImportsPage {
	private readonly catalog = inject(GamesCatalogService);
	private readonly destroyRef = inject(DestroyRef);

	private errorText(error: any): string {
		if (typeof error?.error === 'string' && error.error.trim()) {
			return error.error.trim();
		}

		return error?.error?.error ?? error?.message ?? 'Ошибка импорта';
	}
	readonly query = new FormControl('', { nonNullable: true });
	readonly busy = signal(false);
	readonly result = signal('');
	readonly refreshResult = signal('');
	readonly importResult = signal('');
	readonly source = new FormControl('igdb', { nonNullable: true });
	readonly order = new FormControl('rating', { nonNullable: true });
	readonly limit = new FormControl(200, { nonNullable: true });
	readonly minRating = new FormControl(0, { nonNullable: true });
	readonly yearFrom = new FormControl(0, { nonNullable: true });
	readonly yearTo = new FormControl(0, { nonNullable: true });
	readonly onlyMissing = new FormControl(true, { nonNullable: true });
	readonly previewItems = signal<Game[]>([]);
	readonly currentYear = new Date().getFullYear();
	readonly yearLabels = ['Любой', ...Array.from({ length: this.currentYear - 1949 }, (_, index) => String(this.currentYear - index))];
	readonly yearFromLabel = signal('Любой');
	readonly yearToLabel = signal('Любой');
	readonly sourceLabels = ['RAWG', 'IGDB'];
	readonly orderLabels = ['По рейтингу', 'Новые', 'Популярные'];
	readonly sourceLabel = signal('IGDB');
	readonly searchSourceLabel = signal('IGDB');
	readonly searchSourceLabels = ['IGDB', 'RAWG'];
	searchSource = 'igdb';
	readonly orderLabel = signal('По рейтингу');

	setYearFrom(label: string): void {
		this.yearFromLabel.set(label);
		this.yearFrom.setValue(label === 'Любой' ? 0 : Number(label));
	}

	setYearTo(label: string): void {
		this.yearToLabel.set(label);
		this.yearTo.setValue(label === 'Любой' ? 0 : Number(label));
	}

	setSource(label: string): void {
		const index = this.sourceLabels.indexOf(label);

		if (index < 0) {
			return;
		}

		this.sourceLabel.set(label);
		this.source.setValue(index === 1 ? 'igdb' : 'rawg');
	}

	setSearchSource(label: string): void {
		this.searchSourceLabel.set(label);
		this.searchSource = label === 'RAWG' ? 'rawg' : 'igdb';
	}

	setOrder(label: string): void {
		const index = this.orderLabels.indexOf(label);

		if (index < 0) {
			return;
		}

		this.orderLabel.set(label);
		this.order.setValue(index === 1 ? 'new' : index === 2 ? 'popular' : 'rating');
	}

	run(): void {
		const value = this.query.value.trim();

		if (!value || this.busy()) {
			return;
		}

		this.busy.set(true);
		this.previewItems.set([]);
		this.catalog
			.importSearch(value, this.searchSource)
			.pipe(
				catchError((error) => {
					this.busy.set(false);
					this.result.set(this.errorText(error));

					return of(null);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((response) => {
				this.busy.set(false);

				if (!response) {
					return;
				}

				this.result.set(`Добавлено ${response.imported}, пропущено ${response.skipped}`);
				this.previewItems.set(response.items ?? []);
			});
	}

	startImport(): void {
		if (this.busy()) {
			return;
		}

		this.busy.set(true);
		this.importResult.set('');

		this.catalog
			.import({
				source: this.source.value,
				limit: Number(this.limit.value) || 1000,
				minRating: Number(this.minRating.value) || 0,
				order: this.order.value,
				yearFrom: Number(this.yearFrom.value) || 0,
				yearTo: Number(this.yearTo.value) || 0,
				onlyMissing: this.onlyMissing.value,
			})
			.pipe(
				catchError((error) => {
					this.busy.set(false);
					this.importResult.set(this.errorText(error));

					return of(null);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((response) => {
				this.busy.set(false);

				if (response) {
					this.importResult.set(
						`Добавлено ${response.imported}, пропущено ${response.skipped}, всего ${response.total}`,
					);
				}
			});
	}

	refresh(): void {
		this.catalog
			.refreshCatalog()
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((response) => this.refreshResult.set(response ? `Обновлено, всего ${response.total}` : 'Ошибка'));
	}
}
