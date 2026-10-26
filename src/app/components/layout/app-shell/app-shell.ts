import type { TranslationKey } from '@shared/services/i18n.service';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { imageUrl } from '@shared/helpers/proxy-image';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TWITCH_CHANNEL_URL } from '@shared/config';
import { AlertsService } from '@shared/services/alerts.service';
import { AppSettingsService } from '@shared/services/app-settings.service';
import { I18nService } from '@shared/services/i18n.service';
import { OnboardingService } from '@shared/services/onboarding.service';
import { TwitchService } from '@shared/services/twitch.service';
import { GamesCatalogService } from '@shared/services/games-catalog.service';
import { ProfileDataService } from '@shared/services/profile-data.service';
import { SteamService, type SteamLibraryGame, type SteamMe } from '@shared/services/steam.service';
import { TuiButton, TuiIcon, TuiInput, TuiTextfield } from '@taiga-ui/core';
import {
	Subject,
	catchError,
	debounceTime,
	distinctUntilChanged,
	filter,
	fromEvent,
	map,
	of,
	switchMap,
	timer,
} from 'rxjs';
import { UpdateNotice } from '@shared/components/update-notice/update-notice';
import { Logo } from '../../ui/logo/logo';
import type { SearchItem } from '../app-search/app-search';
import { AppSearch } from '../app-search/app-search';

interface NavItem {
	labelKey: TranslationKey;
	link: string;
	icon: string;
}

const MAIN_NAV: NavItem[] = [
	{ labelKey: 'nav.dashboard', link: '/app/dashboard', icon: '@tui.layout-dashboard' },
	{ labelKey: 'nav.events', link: '/app/events', icon: '@tui.calendar-days' },
	{ labelKey: 'nav.games', link: '/app/games', icon: '@tui.gamepad-2' },
	{ labelKey: 'nav.chat', link: '/app/chat', icon: '@tui.message-circle' },
	{ labelKey: 'nav.viewers', link: '/app/viewers', icon: '@tui.users' },
	{ labelKey: 'nav.chatJury', link: '/app/chat-jury', icon: '@tui.messages-square' },
	{ labelKey: 'nav.points', link: '/app/points', icon: '@tui.coins' },
	{ labelKey: 'nav.polls', link: '/app/polls', icon: '@tui.bar-chart-3' },
	{ labelKey: 'nav.roulette', link: '/app/roulette', icon: '@tui.dices' },
	{ labelKey: 'nav.wheel', link: '/app/wheel', icon: '@tui.circle-dashed' },
	{ labelKey: 'nav.stream', link: '/app/stream', icon: '@tui.monitor' },
	{ labelKey: 'nav.commands', link: '/app/commands', icon: '@tui.terminal' },
	{ labelKey: 'nav.moderation', link: '/app/moderation', icon: '@tui.shield' },
	{ labelKey: 'nav.donations', link: '/app/donations', icon: '@tui.heart' },
	{ labelKey: 'nav.music', link: '/app/music', icon: '@tui.music' },
	{ labelKey: 'nav.widgets', link: '/app/widgets', icon: '@tui.blocks' },
];

const TITLES: Record<string, string> = {
	dashboard: 'Дашборд',
	events: 'События',
	chat: 'Чат',
	'chat-jury': 'Чат-жюри',
	widgets: 'Виджеты',
	twitch: 'Twitch',
	settings: 'Настройки',
	profile: 'Профиль',
	notifications: 'Уведомления',
};

function resolveTitle(url: string): string {
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

const SETTINGS_SECTIONS = [
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

const WIDGET_ITEMS = [
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

@Component({
	imports: [
		RouterLink,
		RouterLinkActive,
		RouterOutlet,
		TuiButton,
		TuiIcon,
		TuiInput,
		TuiTextfield,
		Logo,
		UpdateNotice,
		AppSearch,
	],
	selector: 'app-app-shell',
	styleUrl: './app-shell.scss',
	templateUrl: './app-shell.html',
})
export default class AppShell {
	readonly i18n = inject(I18nService);
	readonly onboarding = inject(OnboardingService);
	readonly twitchUrl = TWITCH_CHANNEL_URL;
	private readonly router = inject(Router);
	private readonly twitchService = inject(TwitchService);
	private readonly destroyRef = inject(DestroyRef);
	private lastStreakKey = '';
	private readonly games = inject(GamesCatalogService);
	private readonly profileData = inject(ProfileDataService);
	private readonly steam = inject(SteamService);
	private readonly appSettings = inject(AppSettingsService);
	private readonly searchQuery = new Subject<string>();
	private readonly alerts = inject(AlertsService);

	private readonly url = toSignal(
		this.router.events.pipe(
			filter((event) => event instanceof NavigationEnd),
			map((event) => event.urlAfterRedirects),
		),
		{ initialValue: this.router.url },
	);

	readonly title = computed(() => resolveTitle(this.url()));
	readonly desktop = navigator.userAgent.includes('NamelessStreamHataDesktop') || '__TAURI_INTERNALS__' in window;
	readonly faqUrl = 'https://streamhata.rdpctd.dev/faq';
	openSystem(event: MouseEvent): void {
		event.preventDefault();
		const internals = (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] as
			| { invoke?: (command: string) => Promise<unknown> }
			| undefined;

		if (internals?.invoke) {
			void internals.invoke('open_system_window');
		} else {
			location.href = '/app/system';
		}
	}

	openFaq(event: MouseEvent): void {
		event.preventDefault();
		if (this.desktop) {
			location.href = `streamhata://open?url=${encodeURIComponent(this.faqUrl)}`;

			return;
		}

		window.open(this.faqUrl, '_blank');
	}
	readonly logoLink = this.desktop ? '/app/dashboard' : '/';
	readonly menuOpen = signal(false);
	readonly showSidebarHeader = this.appSettings.showSidebarHeader;
	readonly sidebarCollapsed = this.appSettings.sidebarCollapsed;
	readonly toast = signal<{ title: string; text: string } | null>(null);
	readonly searchOpen = signal(false);
	readonly dockOpen = signal(false);
	toggleSidebarHeader(): void {
		this.showSidebarHeader.update((value) => !value);
	}

	toggleSidebar(): void {
		this.sidebarCollapsed.update((value) => !value);
	}
	readonly gameResults = signal<SearchItem[]>([]);
	readonly mainNav = computed(() =>
		MAIN_NAV.map((item) => ({ ...item, label: this.i18n.t(item.labelKey) })),
	);

	readonly twitch = toSignal(
		timer(0, 30000).pipe(
			switchMap(() => this.twitchService.login().pipe(catchError(() => of(null)))),
		),
		{ initialValue: null },
	);

	readonly initials = computed(() =>
		(this.twitch()?.user?.displayName ?? 'NS').slice(0, 2).toUpperCase(),
	);

	readonly steamMe = toSignal(
		this.steam.me().pipe(catchError(() => of(null))),
		{ initialValue: null as SteamMe | null },
	);

	readonly steamLibrary = toSignal(
		timer(0, 60_000).pipe(
			switchMap(() =>
				this.steam.library().pipe(
					map((response) => response.items),
					catchError(() => of([])),
				),
			),
		),
		{ initialValue: [] as SteamLibraryGame[] },
	);
	readonly streamOnline = computed(() => Boolean(this.twitch()?.steam?.online));
	readonly loggedIn = computed(() => Boolean(this.twitch()?.valid));
	readonly unreadCount = this.alerts.unreadCount;
	private wasLoggedIn = false;
	private loginEventShown = false;

	preloadProfile(): void {
		this.profileData.load().subscribe();
	}

	readonly searchItems = computed<SearchItem[]>(() => [
		{
			id: 'page-faq',
			group: 'pages' as const,
			title: 'FAQ и справка',
			subtitle: 'Ответы на вопросы',
			icon: '@tui.circle-help',
			link: '/faq',
			keywords: 'faq справка помощь вопросы инструкция',
		},
		{
			id: 'page-suggest-game',
			group: 'pages' as const,
			title: 'Предложить игру',
			subtitle: 'Заявка в каталог',
			icon: '@tui.plus',
			link: '/suggest-game',
			keywords: 'предложить игру заявка каталог',
		},
		...MAIN_NAV.map((item) => ({
			id: `page-${item.link}`,
			group: 'pages' as const,
			title: this.i18n.t(item.labelKey),
			subtitle: 'Страница',
			icon: item.icon,
			link: item.link,
			keywords: item.link,
		})),
		...SETTINGS_SECTIONS.map((item) => ({
			id: `settings-${item.id}`,
			group: 'settings' as const,
			title: this.i18n.t(item.labelKey),
			subtitle: 'Настройки',
			icon: item.icon,
			link: `/app/settings?section=${item.id}`,
			keywords: item.id,
		})),
		...this.steamLibrary()
			.slice(0, 600)
			.map((game) => ({
				id: `steam-${game.appId}`,
				group: 'games' as const,
				title: game.name,
				subtitle: `Steam · ${(game.playtimeMinutes / 60).toFixed(1)} ч`,
				icon: '@tui.gamepad-2',
				link: game.streamhataSlug
					? `/app/games/${game.streamhataSlug}`
					: `https://store.steampowered.com/app/${game.appId}`,
				keywords: game.name,
				thumbnail: game.iconUrl,
			})),
		...WIDGET_ITEMS.map((item) => ({
			id: `widget-${item.kind}`,
			group: 'widgets' as const,
			title: item.title,
			subtitle: 'Настройка виджета',
			icon: item.icon,
			link: `/app/widgets/${item.kind}/config`,
			keywords: item.kind,
		})),
	]);

	readonly labels = computed(() => ({
		main: this.i18n.t('nav.main'),
		system: this.i18n.t('nav.system'),
		settings: this.i18n.t('nav.settings'),
		admin: this.i18n.t('nav.admin'),
		search: this.i18n.t('shell.search'),
		searchLabel: this.i18n.t('shell.searchLabel'),
		notifications: this.i18n.t('shell.notifications'),
		profile: this.i18n.t('shell.profile'),
		offline: this.i18n.t('shell.offline'),
		checkTwitch: this.i18n.t('shell.checkTwitch'),
		searchTitle: this.i18n.t('search.title'),
		searchPlaceholder: this.i18n.t('search.placeholder'),
		searchPages: this.i18n.t('search.pages'),
		searchSettings: this.i18n.t('search.settingsGroup'),
		searchWidgets: this.i18n.t('search.widgets'),
		searchGames: this.i18n.t('search.games'),
		searchHint: this.i18n.t('search.hint'),
	}));

	constructor() {
		effect(() => {
			const profile = this.twitch();
			const valid = Boolean(profile?.valid);
			const loginEvent = document.cookie
				.split(';')
				.some((cookie) => cookie.trim().startsWith('e-hub-login-event='));

			if (valid && loginEvent && !this.loginEventShown) {
				this.loginEventShown = true;
				const name = profile?.user?.displayName || profile?.user?.username || 'Twitch';

				document.cookie = 'e-hub-login-event=; Path=/; Domain=.rdpctd.dev; Max-Age=0; SameSite=Lax';
				this.toast.set({ title: 'Вход выполнен', text: `${name} подключён` });
				this.alerts.notify('login', name, 'Вход выполнен').subscribe({ error: () => undefined });
				timer(6000)
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe(() => this.toast.set(null));
			}

			this.wasLoggedIn = valid;
		});

		fromEvent<KeyboardEvent>(window, 'keydown', { capture: true })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((event) => {
				const key = event.key.toLowerCase();
				const code = event.code;
				const isFind = (event.ctrlKey || event.metaKey) && (key === 'f' || code === 'KeyF');
				const isAltK = event.altKey && (key === 'k' || key === 'к' || code === 'KeyK');
				const isCtrlK = (event.ctrlKey || event.metaKey) && (key === 'k' || code === 'KeyK');
				const setting = this.appSettings.searchHotkey();
				const matches =
					setting === 'ctrl+f'
						? isFind
						: setting === 'alt+k'
							? isAltK
							: setting === 'ctrl+k'
								? isCtrlK
								: isFind || isAltK;

				if (!matches) {
					return;
				}

				event.preventDefault();
				event.stopPropagation();
				this.searchOpen.set(true);
			});

		timer(8000, 15000)
			.pipe(
				switchMap(() => this.twitchService.getLatestStreak().pipe(catchError(() => of(null)))),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((streak) => {
				if (!streak || !streak.userId || !this.loggedIn()) {
					return;
				}

				const key = `${streak.userId}:${streak.streakCount}`;

				if (key === this.lastStreakKey) {
					return;
				}

				this.lastStreakKey = key;
				this.toast.set({
					title: 'Стрик зрителя',
					text: `${streak.displayName} смотрит ${streak.streakCount}-й стрим подряд`,
				});
				this.alerts
					.notify('streak', streak.displayName, `${streak.streakCount}-й стрим подряд`)
					.subscribe({ error: () => undefined });
				timer(6000)
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe(() => this.toast.set(null));
			});

		this.searchQuery
			.pipe(
				debounceTime(250),
				distinctUntilChanged(),
				switchMap((query) =>
					query.trim().length < 2
						? of({ items: [] })
						: this.games.search(query, 8).pipe(catchError(() => of({ items: [] }))),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((response) => {
				this.gameResults.set(
					response.items.map((game) => ({
						id: `game-${game.slug}`,
						group: 'games' as const,
						title: game.title,
						subtitle: `${game.year || '—'} · ${game.platforms[0]?.name ?? 'Игра'}`,
						icon: '@tui.gamepad-2',
						link: `/app/games/${game.slug}`,
						keywords: `${game.platforms.map((platform) => platform.name).join(' ')} ${game.genresRu?.join(' ') ?? ''} ${game.genres?.join(' ') ?? ''} ${game.titleRu ?? ''} ${game.searchTags?.join(' ') ?? ''}`,
						thumbnail: imageUrl(game.cover),
					})),
				);
			});
	}

	search(value: string): void {
		this.searchQuery.next(value);
	}

	openSearch(): void {
		this.searchOpen.set(true);
	}

	closeSearch(): void {
		this.searchOpen.set(false);
	}

	navigateSearch(link: string): void {
		this.searchOpen.set(false);

		if (/^https?:\/\//.test(link)) {
			window.open(link, '_blank', 'noopener');

			return;
		}

		void this.router.navigateByUrl(link);
	}
}
