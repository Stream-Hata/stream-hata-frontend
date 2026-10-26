import { Component, computed, inject } from '@angular/core';
import { AlertsService } from '@shared/services/alerts.service';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { RouterLink } from '@angular/router';

interface Notice {
	id: string;
	icon: string;
	tone: string;
	title: string;
	time: string;
	unread: boolean;
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
	day: 'numeric',
	month: 'short',
	hour: '2-digit',
	minute: '2-digit',
};

const TYPE_META: Record<string, { icon: string; tone: string; label: string }> = {
	follow: { icon: '@tui.user-plus', tone: 'cyan', label: 'Новый фолловер' },
	subscribe: { icon: '@tui.star', tone: 'magenta', label: 'Новая подписка' },
	gift: { icon: '@tui.gift', tone: 'yellow', label: 'Подарочная подписка' },
	resub: { icon: '@tui.refresh-cw', tone: 'magenta', label: 'Продление подписки' },
	cheer: { icon: '@tui.zap', tone: 'green', label: 'Битсы' },
	raid: { icon: '@tui.users', tone: 'cyan', label: 'Рейд' },
	hype_train: { icon: '@tui.train-front', tone: 'yellow', label: 'Хайп-трейн' },
	goal: { icon: '@tui.target', tone: 'purple', label: 'Цель достигнута' },
	stream_online: { icon: '@tui.radio', tone: 'green', label: 'Стрим начался' },
	login: { icon: '@tui.log-in', tone: 'green', label: 'Вход в панель' },
	streak: { icon: '@tui.flame', tone: 'yellow', label: 'Стрик зрителя' },
	system: { icon: '@tui.bell', tone: 'purple', label: 'Система' },
	stream_offline: { icon: '@tui.radio', tone: 'neutral', label: 'Стрим завершён' },
};

function formatTime(value: string): string {
	const date = new Date(value);

	return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU', DATE_FORMAT);
}

@Component({
	imports: [RouterLink, TuiButton, TuiIcon],
	selector: 'app-notifications-page',
	styleUrl: './notifications-page.scss',
	templateUrl: './notifications-page.html',
})
export default class NotificationsPage {
	private readonly alertsService = inject(AlertsService);
	private readonly alerts = this.alertsService.state;

	readonly notices = computed<Notice[]>(() =>
		(this.alerts()?.events ?? []).map((event) => {
			const meta = TYPE_META[event.type] ?? {
				icon: '@tui.bell',
				tone: 'purple',
				label: 'Событие',
			};

			return {
				id: event.id,
				icon: meta.icon,
				tone: meta.tone,
				title: `${meta.label}${event.username ? ` · ${event.username}` : ''}`,
				time: formatTime(event.createdAt),
				unread: !this.alertsService.isRead(event.id),
			};
		}),
	);

	readonly hasUnread = computed(() => this.alertsService.unreadCount() > 0);

	markAllRead(): void {
		this.alertsService.markAllRead();
	}
}
