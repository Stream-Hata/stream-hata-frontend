import type { TranslationKey } from '@api/i18n.service';

export interface NavItem {
	labelKey: TranslationKey;
	link: string;
	icon: string;
	external?: boolean;
}

export const MAIN_NAV: NavItem[] = [
	{ labelKey: 'nav.dashboard', link: '/app/dashboard', icon: '@tui.layout-dashboard' },
	{ labelKey: 'nav.events', link: '/app/events', icon: '@tui.calendar-days' },
	{ labelKey: 'nav.games', link: '/app/games', icon: '@tui.gamepad-2' },
	{ labelKey: 'nav.plugins', link: '/app/plugins', icon: '@tui.package' },
	{ labelKey: 'nav.chat', link: '/app/chat', icon: '@tui.message-circle' },
	{ labelKey: 'nav.messages', link: '/app/messages', icon: '@tui.send' },
	{ labelKey: 'nav.notifications', link: '/app/notifications', icon: '@tui.bell' },
	{ labelKey: 'nav.viewers', link: '/app/viewers', icon: '@tui.users' },
	{ labelKey: 'nav.chatJury', link: '/app/chat-jury', icon: '@tui.messages-square' },
	{ labelKey: 'nav.points', link: '/app/points', icon: '@tui.coins' },
	{ labelKey: 'nav.polls', link: '/app/polls', icon: '@tui.bar-chart-3' },
	{ labelKey: 'nav.roulette', link: '/app/roulette', icon: '@tui.dices' },
	{ labelKey: 'nav.wheel', link: '/app/wheel', icon: '@tui.circle-dashed' },
	{ labelKey: 'nav.journal', link: '/app/journal', icon: '@tui.notebook-pen' },
	{ labelKey: 'nav.stream', link: '/app/stream', icon: '@tui.monitor' },
	{ labelKey: 'nav.commands', link: '/app/commands', icon: '@tui.terminal' },
	{ labelKey: 'nav.telegram', link: '/app/telegram', icon: '@tui.send' },
	{
		labelKey: 'nav.feedback',
		link: 'https://streamhata.rdpctd.dev/feedback',
		icon: '@tui.message-square',
		external: true,
	},
	{ labelKey: 'nav.moderation', link: '/app/moderation', icon: '@tui.shield' },
	{ labelKey: 'nav.donations', link: '/app/donations', icon: '@tui.heart' },
	{ labelKey: 'nav.music', link: '/app/music', icon: '@tui.music' },
	{ labelKey: 'nav.widgets', link: '/app/widgets', icon: '@tui.blocks' },
];

const TITLES: Record<string, string> = {
	'dashboard': 'Дашборд',
	'events': 'События',
	'chat': 'Чат',
	'messages': 'Сообщения',
	'chat-jury': 'Чат-жюри',
	'widgets': 'Виджеты',
	'twitch': 'Twitch',
	'settings': 'Настройки',
	'profile': 'Профиль',
	'notifications': 'Уведомления',
};

export function resolveTitle(url: string): string {
	if (url.includes('/chat-jury/settings')) {
		return 'Настройки чат-жюри';
	}

	if (url.endsWith('/config')) {
		return 'Настройка виджета';
	}

	const segment = url.split('?')[0].split('/').filter(Boolean)[1] ?? 'dashboard';

	if (/events\/[^/]+$/.test(url)) {
		return 'Событие';
	}

	return TITLES[segment] ?? 'Nameless StreamHata';
}

export const SETTINGS_SECTIONS = [
	{ id: 'general', labelKey: 'settings.general' as const, icon: '@tui.globe' },
	{ id: 'appearance', labelKey: 'settings.appearance' as const, icon: '@tui.palette' },
	{ id: 'twitch', labelKey: 'settings.twitch' as const, icon: '@tui.tv' },
	{ id: 'jury', labelKey: 'settings.jury' as const, icon: '@tui.messages-square' },
	{ id: 'widgets', labelKey: 'settings.widgets' as const, icon: '@tui.blocks' },
	{ id: 'notifications', labelKey: 'settings.notifications' as const, icon: '@tui.bell' },
	{ id: 'integrations', labelKey: 'settings.integrations' as const, icon: '@tui.plug' },
	{ id: 'accessibility', labelKey: 'settings.accessibility' as const, icon: '@tui.accessibility' },
	{ id: 'network', labelKey: 'settings.network' as const, icon: '@tui.wifi' },
];

export const WIDGET_ITEMS = [
	{ kind: 'jury', title: 'Чат-жюри', icon: '@tui.messages-square' },
	{ kind: 'timer', title: 'Таймер', icon: '@tui.timer' },
	{ kind: 'hotbar', title: 'Хотбар', icon: '@tui.layout-grid' },
	{ kind: 'alerts', title: 'Алерты', icon: '@tui.bell' },
	{ kind: 'events', title: 'События', icon: '@tui.calendar-days' },
	{ kind: 'donations', title: 'Донаты', icon: '@tui.heart' },
	{ kind: 'audio', title: 'Аудио', icon: '@tui.volume-2' },
	{ kind: 'wheel', title: 'Колесо', icon: '@tui.circle-dashed' },
	{ kind: 'chat', title: 'Чат', icon: '@tui.message-circle' },
	{ kind: 'points', title: 'Баллы', icon: '@tui.coins' },
	{ kind: 'music', title: 'Музыка', icon: '@tui.music' },
	{ kind: 'streaks', title: 'Стрики', icon: '@tui.flame' },
];
