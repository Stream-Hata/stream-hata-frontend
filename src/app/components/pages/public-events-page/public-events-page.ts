import type { StreamEvent } from '@shared/services/events.service';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { StreamEventsService } from '@shared/services/events.service';
import { TuiIcon, TuiLink } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { catchError, of } from 'rxjs';

const TYPE_LABELS: Record<string, string> = {
	custom: 'Событие',
	jury: 'Чат-жюри',
	achievement: 'Достижение',
	timer: 'Таймер',
	donation: 'Донат',
};

@Component({
	imports: [RouterLink, TuiBadge, TuiIcon, TuiLink],
	selector: 'app-public-events-page',
	template: `
		<div class="public-page">
			<div class="container">
				<header class="public-nav">
					<a class="public-logo" routerLink="/">Nameless StreamHata</a>
					<nav class="public-links">
						<a routerLink="/events" tuiLink>События</a>
						<a routerLink="/faq" tuiLink>FAQ</a>
						<a routerLink="/app/dashboard" tuiLink>В панель</a>
					</nav>
				</header>

				<section class="events-hero">
					<span class="eyebrow">Календарь</span>
					<h1 class="jk-display">События канала</h1>
					<p class="jk-body-sm jk-muted">
						Запланированные эфиры, турниры, голосования и активности сообщества.
					</p>
				</section>

				<div class="events-grid">
					@for (event of events().events; track event.id) {
						<article class="jk-card event-card">
							<div class="event-head">
								<span appearance="info" tuiBadge>{{ typeLabel(event.type) }}</span>
								<span class="jk-caption">{{ dateLabel(event.startsAt) }}</span>
							</div>
							<h2 class="jk-h4">{{ event.title }}</h2>
							<div class="event-foot">
								<span appearance="neutral" tuiBadge>{{ statusLabel(event.status) }}</span>
								<a routerLink="/app/events" tuiLink>Открыть в панели</a>
							</div>
						</article>
					} @empty {
						<div class="jk-card jk-empty">
							<tui-icon icon="@tui.calendar-x" />
							<span>Пока нет запланированных событий</span>
						</div>
					}
				</div>
			</div>
		</div>
	`,
	styles: `
		.events-hero {
			padding: 48px 0 24px;
		}

		.events-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
			gap: 16px;
		}

		.event-card {
			display: flex;
			gap: 10px;
			flex-direction: column;
			padding: 20px;
		}

		.event-head,
		.event-foot {
			display: flex;
			justify-content: space-between;
			gap: 12px;
			align-items: center;
		}

		.event-head {
			color: var(--text-secondary);
		}
	`,
})
export default class PublicEventsPage {
	private readonly service = inject(StreamEventsService);
	readonly events = toSignal(
		this.service.list().pipe(catchError(() => of({ events: [] as StreamEvent[] }))),
		{ initialValue: { events: [] as StreamEvent[] } },
	);

	typeLabel(type: string): string {
		return TYPE_LABELS[type] ?? type;
	}

	statusLabel(status: string): string {
		const labels: Record<string, string> = {
			planned: 'Запланировано',
			active: 'Идёт сейчас',
			done: 'Завершено',
		};

		return labels[status] ?? status;
	}

	dateLabel(value?: string): string {
		if (!value) {
			return 'Дата уточняется';
		}

		const date = new Date(value);

		return Number.isNaN(date.getTime())
			? 'Дата уточняется'
			: date.toLocaleString('ru-RU', {
					day: 'numeric',
					month: 'long',
					hour: '2-digit',
					minute: '2-digit',
				});
	}
}
