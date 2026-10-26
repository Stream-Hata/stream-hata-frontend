import { Component, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UpdateNotice } from '@shared/components/update-notice/update-notice';
import { RoleService } from '@shared/services/role.service';
import { TuiButton, TuiIcon, TuiRoot } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { filter, map } from 'rxjs';

const NAV = [
	{ link: '/', label: 'Обзор', icon: '@tui.layout-dashboard', exact: true },
	{ link: '/games', label: 'Игры', icon: '@tui.gamepad-2' },
	{ link: '/synonyms', label: 'Синонимы', icon: '@tui.search' },
	{ link: '/suggestions', label: 'Заявки', icon: '@tui.inbox' },
	{ link: '/imports', label: 'Импорт', icon: '@tui.download' },
	{ link: '/users', label: 'Пользователи', icon: '@tui.users' },
];

const APP_NAV = [
	{ link: '/app/dashboard', label: 'Дашборд', icon: '@tui.layout-dashboard' },
	{ link: '/app/viewers', label: 'Зрители', icon: '@tui.users' },
	{ link: '/app/points', label: 'Баллы', icon: '@tui.coins' },
	{ link: '/app/roulette', label: 'Рулетка', icon: '@tui.dices' },
	{ link: '/app/wheel', label: 'Колесо', icon: '@tui.circle-dashed' },
	{ link: '/app/events', label: 'События', icon: '@tui.calendar-days' },
	{ link: '/app/polls', label: 'Опросы', icon: '@tui.bar-chart-3' },
	{ link: '/app/moderation', label: 'Модерация', icon: '@tui.shield' },
	{ link: '/app/donations', label: 'Донаты', icon: '@tui.heart' },
	{ link: '/app/music', label: 'Музыка', icon: '@tui.music' },
	{ link: '/app/widgets', label: 'Виджеты', icon: '@tui.blocks' },
	{ link: '/app/stream', label: 'Стрим', icon: '@tui.monitor' },
	{ link: '/app/settings', label: 'Настройки', icon: '@tui.settings' },
];

const TITLES: Record<string, string> = {
	'': 'Обзор',
	'games': 'Игры',
	'synonyms': 'Синонимы',
	'imports': 'Импорт',
	'suggestions': 'Заявки на игры',
	'users': 'Пользователи',
};

@Component({
	imports: [RouterLink, RouterLinkActive, RouterOutlet, TuiBadge, TuiButton, TuiIcon, TuiRoot, UpdateNotice],
	selector: 'app-admin-root',
	encapsulation: ViewEncapsulation.None,
	styleUrl: './admin-root.scss',
	templateUrl: './admin-root.html',
})
export class AdminRoot {
	private readonly router = inject(Router);
	readonly roles = inject(RoleService);
	readonly nav = NAV;
	readonly appNav = APP_NAV;
	readonly appOrigin = 'https://streamhata.rdpctd.dev';
	readonly menuOpen = signal(false);
	readonly loading = computed(() => !this.roles.profile());
	readonly denied = computed(
		() =>
			Boolean(this.roles.profile()?.valid) &&
			this.roles.roles() !== null &&
			!this.roles.isAdmin(),
	);

	private readonly url = toSignal(
		this.router.events.pipe(
			filter((event) => event instanceof NavigationEnd),
			map((event) => event.urlAfterRedirects),
		),
		{ initialValue: this.router.url },
	);

	readonly title = computed(() => {
		const parts = this.url().split('?')[0].split('/').filter(Boolean);
		const segment = parts[0] ?? '';

		if (segment === 'games' && parts.length > 1) {
			return 'Игра';
		}

		if (segment === 'users' && parts.length > 1) {
			return 'Пользователь';
		}

		return TITLES[segment] ?? 'Админка';
	});

	readonly initials = computed(() => {
		const user = this.roles.profile()?.user;

		return (user?.displayName || user?.username || 'AD')
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0] ?? '')
			.join('')
			.toUpperCase();
	});

	login(): void {
		const target = encodeURIComponent(`${location.origin}/`);

		location.assign(`https://streamhata.rdpctd.dev/rgg-sync/twitch/authorize?return=${target}`);
	}
}
