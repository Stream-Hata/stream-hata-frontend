/* eslint-disable max-len */
import type { GameSuggestion } from '@shared/services/suggestions.service';
import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SuggestionsService } from '@shared/services/suggestions.service';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';

@Component({
	imports: [DatePipe, FormsModule, TuiBadge, TuiButton, TuiIcon],
	selector: 'app-admin-suggestions',
	template: `
		<section class="suggestions-page">
			<header class="suggestions-head">
				<div>
					<h1 class="jk-h2">Заявки на игры</h1>
					<p class="jk-caption">Предложения зрителей. Одобренные заявки проверяйте вручную перед добавлением в каталог.</p>
				</div>
				<select class="suggestions-filter" [ngModel]="filter()" (ngModelChange)="setFilter($event)">
					<option value="">Все статусы</option>
					<option value="pending">На проверке</option>
					<option value="approved">Одобренные</option>
					<option value="rejected">Отклонённые</option>
				</select>
			</header>

			@if (error()) {
				<p class="suggestions-error">{{ error() }}</p>
			}

			@if (items().length) {
				<div class="suggestions-list">
					@for (item of items(); track item.id) {
						<article class="jk-card suggestion-row">
							<div class="suggestion-main">
								<div class="suggestion-title-line">
									<strong>{{ item.title }}</strong>
									<span [appearance]="statusAppearance(item.status)" tuiBadge>{{ statusLabel(item.status) }}</span>
								</div>
								<span class="jk-caption">
									{{ item.platform || 'Платформа не указана' }}{{ item.year ? ' · ' + item.year : '' }}
									· @{{ item.userLogin }} · {{ item.createdAt | date: 'dd.MM.yyyy HH:mm' }}
								</span>
								@if (item.coverUrl) {
									<p class="suggestion-links">Обложка: {{ item.coverUrl }}</p>
								}
								@if (item.screenshots) {
									<p class="suggestion-links">Скриншоты: {{ item.screenshots }}</p>
								}
								@if (item.description) {
									<p class="suggestion-comment">{{ item.description }}</p>
								}
								<p class="jk-caption">
									{{ item.genres || 'жанры не указаны' }} · {{ item.developer || 'разработчик не указан' }} · {{ item.publisher || 'издатель не указан' }}
								</p>
								@if (item.website) {
									<p class="suggestion-links">Сайт: {{ item.website }}</p>
								}
								@if (item.services?.length) {
									<p class="jk-caption">Искать в: {{ item.services.join(', ') }}</p>
								}
								@if (item.links) {
									<p class="suggestion-links">{{ item.links }}</p>
								}
								@if (item.comment) {
									<p class="suggestion-comment">{{ item.comment }}</p>
								}
								@if (item.moderatorComment) {
									<p class="jk-caption">Модератор: {{ item.moderatorComment }}</p>
								}
							</div>
							<div class="suggestion-actions">
								<button appearance="primary" size="s" type="button" tuiButton (click)="review(item, 'approved')">Одобрить</button>
								<button appearance="secondary-destructive" size="s" type="button" tuiButton (click)="review(item, 'rejected')">Отклонить</button>
								<button appearance="flat" size="s" type="button" tuiButton (click)="review(item, 'pending')">Вернуть</button>
							</div>
						</article>
					}
				</div>
			} @else {
				<div class="jk-card jk-empty">
					<tui-icon icon="@tui.inbox" />
					<span class="jk-h4">Заявок нет</span>
					<span class="jk-caption">Новые предложения появятся здесь.</span>
				</div>
			}
		</section>
	`,
	styles: `
		.suggestions-page {
			display: flex;
			gap: 16px;
			flex-direction: column;
		}

		.suggestions-head {
			display: flex;
			gap: 16px;
			align-items: flex-start;
			justify-content: space-between;
		}

		.suggestions-filter {
			padding: 8px 10px;
			border: 1px solid var(--border-normal);
			border-radius: 10px;
			background: var(--surface-raised);
			color: var(--text-primary);
		}

		.suggestions-list {
			display: flex;
			gap: 10px;
			flex-direction: column;
		}

		.suggestion-row {
			display: flex;
			gap: 16px;
			align-items: flex-start;
			justify-content: space-between;
			padding: 14px;
		}

		.suggestion-main {
			display: flex;
			gap: 5px;
			flex-direction: column;
			min-width: 0;
		}

		.suggestion-title-line {
			display: flex;
			gap: 8px;
			align-items: center;
			flex-wrap: wrap;
		}

		.suggestion-links,
		.suggestion-comment {
			white-space: pre-wrap;
			color: var(--text-secondary);
			font: var(--font-body-sm);
			overflow-wrap: anywhere;
		}

		.suggestion-actions {
			display: flex;
			gap: 6px;
			flex-wrap: wrap;
			justify-content: flex-end;
			flex-shrink: 0;
		}

		.suggestions-error {
			color: #ff8f8f;
		}

		@media (width <= 760px) {
			.suggestion-row {
				flex-direction: column;
			}
		}
	`,
})
export class SuggestionsAdminPage {
	private readonly service = inject(SuggestionsService);
	readonly items = signal<GameSuggestion[]>([]);
	readonly error = signal('');
	readonly filter = signal('pending');
	readonly count = computed(() => this.items().length);

	constructor() {
		this.load();
	}

	setFilter(value: string): void {
		this.filter.set(value);
		this.load();
	}

	statusLabel(status: GameSuggestion['status']): string {
		return status === 'approved' ? 'Одобрена' : status === 'rejected' ? 'Отклонена' : 'На проверке';
	}

	statusAppearance(status: GameSuggestion['status']): string {
		return status === 'approved' ? 'positive' : status === 'rejected' ? 'negative' : 'warning';
	}

	review(item: GameSuggestion, status: GameSuggestion['status']): void {
		// eslint-disable-next-line no-alert
		const comment = window.prompt('Комментарий для автора (необязательно)', item.moderatorComment || '') ?? '';

		this.service.review(item.id, status, comment).subscribe({
			next: () => this.load(),
			error: () => this.error.set('Не удалось обновить заявку'),
		});
	}

	private load(): void {
		this.service.list(this.filter()).subscribe({
			next: (response) => {
				this.items.set(response.items);
				this.error.set('');
			},
			error: () => this.error.set('Не удалось загрузить заявки'),
		});
	}
}
