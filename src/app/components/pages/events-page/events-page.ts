import type { StreamEvent } from '@shared/services/events.service';
import { Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { signalControl } from '@shared/helpers/form-control';
import { StreamEventsService } from '@shared/services/events.service';
import {
	TuiTable,
	TuiTableTbody,
	TuiTableTd,
	TuiTableTh,
	TuiTableThead,
} from '@taiga-ui/addon-table';
import {
	TuiButton,
	TuiIcon,
	TuiInput,
	tuiItemsHandlersProvider,
	TuiSelectLike,
	TuiTextfield,
} from '@taiga-ui/core';
import { TuiBadge, TuiChevron, TuiDataListWrapper, TuiInputDateTime } from '@taiga-ui/kit';
import { TuiDay, TuiTime } from '@taiga-ui/cdk';
import { catchError, of, switchMap, timer } from 'rxjs';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
	day: 'numeric',
	month: 'short',
	hour: '2-digit',
	minute: '2-digit',
};

const TYPE_LABELS: Record<string, string> = {
	custom: 'Событие',
	jury: 'Жюри',
	achievement: 'Достижение',
	timer: 'Таймер',
	donation: 'Донат',
};

const TYPE_ICONS: Record<string, string> = {
	custom: '@tui.sparkles',
	jury: '@tui.messages-square',
	achievement: '@tui.trophy',
	timer: '@tui.timer',
	donation: '@tui.heart',
};

const STATUS_LABELS: Record<string, string> = {
	planned: 'Запланировано',
	active: 'Активно',
	done: 'Завершено',
};

const STATUS_BADGES: Record<string, string> = {
	planned: 'warning',
	active: 'positive',
	done: 'neutral',
};

@Component({
	imports: [
		ReactiveFormsModule,
		TuiChevron,
		TuiDataListWrapper,
		TuiSelectLike,
		TuiBadge,
		TuiButton,
		TuiIcon,
		TuiInput,
		TuiTable,
		TuiTableTbody,
		TuiTableTd,
		TuiTableTh,
		TuiTableThead,
		TuiTextfield,
		TuiInputDateTime,
	],
	providers: [
		tuiItemsHandlersProvider({
			stringify: signal((value: string) => TYPE_LABELS[value] ?? STATUS_LABELS[value] ?? value),
		}),
	],
	selector: 'app-events-page',
	styleUrl: './events-page.scss',
	templateUrl: './events-page.html',
})
export default class EventsPage {
	private readonly service = inject(StreamEventsService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly injector = inject(Injector);
	private readonly refresh = signal(0);

	readonly formOpen = signal(false);
	readonly title = signal('');
	readonly type = signal('custom');
	readonly startsAt = signal<readonly [TuiDay, TuiTime | null] | null>(null);
	readonly eventForm = new FormGroup({
		title: signalControl(this.title, this.injector),
		type: signalControl(this.type, this.injector),
		startsAt: signalControl(this.startsAt, this.injector),
	});
	readonly typeValues = ['custom', 'jury', 'achievement', 'timer', 'donation'];
	readonly typeLabels = ['Событие', 'Жюри', 'Достижение', 'Таймер', 'Донат'];
	readonly filter = signal('all');
	readonly search = signal('');
	readonly filters = [
		{ value: 'all', label: 'Все' },
		{ value: 'jury', label: 'Жюри' },
		{ value: 'achievement', label: 'Достижения' },
		{ value: 'timer', label: 'Таймеры' },
		{ value: 'donation', label: 'Донаты' },
	];

	readonly events = toSignal(
		timer(0, 5000).pipe(
			switchMap(() =>
				this.service.list().pipe(catchError(() => of({ events: [] as StreamEvent[] }))),
			),
		),
		{ initialValue: { events: [] as StreamEvent[] } },
	);

	readonly rows = computed(() =>
		this.visibleEvents().map((event) => ({
			...event,
			typeLabel: this.typeLabel(event.type),
			typeIcon: this.typeIcon(event.type),
			statusLabel: this.statusLabel(event.status),
			statusBadge: this.statusBadge(event.status),
			dateLabel: this.formatDate(event.startsAt ?? event.createdAt),
		})),
	);

	readonly visibleEvents = computed(() => {
		const filter = this.filter();
		const search = this.search().trim().toLowerCase();

		return this.events().events.filter((event) => {
			const matchesFilter = filter === 'all' || event.type === filter;
			const matchesSearch = !search || event.title.toLowerCase().includes(search);

			return matchesFilter && matchesSearch;
		});
	});

	typeLabel(type: string): string {
		return TYPE_LABELS[type] ?? type;
	}

	typeIcon(type: string): string {
		return TYPE_ICONS[type] ?? TYPE_ICONS['custom'];
	}

	statusLabel(status: string): string {
		return STATUS_LABELS[status] ?? status;
	}

	statusBadge(status: string): string {
		return STATUS_BADGES[status] ?? 'neutral';
	}

	startsAtISO(): string {
		const value = this.startsAt();

		if (!value) {
			return '';
		}

		const [day, time] = value;
		const date = day.toLocalNativeDate();
		date.setHours(time?.hours ?? 0, time?.minutes ?? 0, 0, 0);

		return date.toISOString();
	}

	formatDate(value?: string): string {
		if (!value) {
			return '—';
		}

		const date = new Date(value);

		return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU', DATE_FORMAT);
	}

	create(): void {
		const title = this.title().trim();

		if (!title) {
			return;
		}

		this.service
			.create({
				title,
				type: this.type(),
				startsAt: this.startsAt() ? this.startsAtISO() : undefined,
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.title.set('');
				this.startsAt.set(null);
				this.formOpen.set(false);
				this.refresh.update((value) => value + 1);
			});
	}

	setStatus(id: number, status: string): void {
		this.service
			.updateStatus(id, status)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.refresh.update((value) => value + 1));
	}

	remove(id: number): void {
		this.service
			.remove(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.refresh.update((value) => value + 1));
	}

	reset(): void {
		this.filter.set('all');
		this.search.set('');
	}
}
