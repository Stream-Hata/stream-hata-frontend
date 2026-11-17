import type { SteamLibraryGame, SteamMe } from '@api/steam.service';
import type { SearchItem } from '../app-search/app-search';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AccountsService } from '@api/accounts.service';
import { AlertsService } from '@api/alerts.service';
import { AppLockService } from '@api/app-lock.service';
import { AppSettingsService } from '@api/app-settings.service';
import { AutoClipsService } from '@api/auto-clips.service';
import { DesktopHotkeysService } from '@api/desktop-hotkeys.service';
import { DiscussionNotificationsService } from '@api/discussion-notifications.service';
import { GamesCatalogService } from '@api/games-catalog.service';
import { I18nService } from '@api/i18n.service';
import { MessagingNotificationsService } from '@api/messaging-notifications.service';
import { MessagingPresenceService } from '@api/messaging-presence.service';
import { ObsAutoSceneService } from '@api/obs-auto-scene.service';
import { OnboardingService } from '@api/onboarding.service';
import { ProfileDataService } from '@api/profile-data.service';
import { RoleService } from '@api/role.service';
import { SecurityNotificationsService } from '@api/security-notifications.service';
import { SteamService } from '@api/steam.service';
import { StreamReportService } from '@api/stream-report.service';
import { SuggestionNotificationsService } from '@api/suggestion-notifications.service';
import { SystemAlertsService } from '@api/system-alerts.service';
import { TwitchService } from '@api/twitch.service';
import { DesktopUpdateNotice } from '@shared/components/desktop-update-notice/desktop-update-notice';
import { UpdateNotice } from '@shared/components/update-notice/update-notice';
import { TWITCH_CHANNEL_URL } from '@shared/config';
import { imageUrl } from '@shared/helpers/proxy-image';
import { TuiButton, TuiIcon, TuiInput, TuiTextfield } from '@taiga-ui/core';
import {
	catchError,
	debounceTime,
	distinctUntilChanged,
	filter,
	fromEvent,
	map,
	of,
	Subject,
	switchMap,
	timer,
} from 'rxjs';
import { FAQ_ITEMS } from '../../pages/faq-page/faq.data';
import { IdleCat } from '../../ui/idle-cat/idle-cat';
import { IdleWarrant } from '../../ui/idle-warrant/idle-warrant';
import { Logo } from '../../ui/logo/logo';
import { AppSearch } from '../app-search/app-search';
import { MAIN_NAV, resolveTitle, SETTINGS_SECTIONS, WIDGET_ITEMS } from './app-shell.nav';

@Component({
	imports: [
		RouterLink,
		RouterLinkActive,
		RouterOutlet,
		DesktopUpdateNotice,
		TuiButton,
		TuiIcon,
		TuiInput,
		TuiTextfield,
		UpdateNotice,
		AppSearch,
		IdleCat,
		IdleWarrant,
		Logo,
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
	private readonly roles = inject(RoleService);
	private readonly twitchService = inject(TwitchService);
	private readonly destroyRef = inject(DestroyRef);
	private lastStreakKey = '';
	private readonly games = inject(GamesCatalogService);
	private readonly profileData = inject(ProfileDataService);
	private readonly steam = inject(SteamService);
	private readonly appSettings = inject(AppSettingsService);
	private readonly searchQuery = new Subject<string>();
	private readonly alerts = inject(AlertsService);
	readonly systemAlerts = inject(SystemAlertsService);
	readonly suggestionNotifications = inject(SuggestionNotificationsService);
	readonly securityNotifications = inject(SecurityNotificationsService);
	readonly autoClips = inject(AutoClipsService);
	readonly appLock = inject(AppLockService);
	readonly obsAutoScene = inject(ObsAutoSceneService);
	readonly messagingPresence = inject(MessagingPresenceService);
	readonly streamReports = inject(StreamReportService);
	readonly hotkeys = inject(DesktopHotkeysService);
	private readonly accounts = inject(AccountsService);
	private savedAccount = '';
	readonly messagingNotifications = inject(MessagingNotificationsService);
	readonly formatUnread = (count: number): string =>
		count > 9999 ? '9999+' : count > 99 ? '99+' : String(count);

	protected readonly imageUrl = imageUrl;
	readonly unlockPin = signal('');
	readonly unlockError = signal('');

	private readonly url = toSignal(
		this.router.events.pipe(
			filter((event) => event instanceof NavigationEnd),
			map((event) => event.urlAfterRedirects),
		),
		{ initialValue: this.router.url },
	);

	readonly title = computed(() => resolveTitle(this.url()));
	readonly desktop =
		navigator.userAgent.includes('NamelessStreamHataDesktop') || '__TAURI_INTERNALS__' in window;

	readonly faqUrl = 'https://streamhata.rdpctd.dev/faq';
	unlock(): void {
		const pin = this.unlockPin();

		this.unlockError.set('');
		void this.appLock.unlock(pin).then((valid) => {
			if (valid) {
				this.unlockPin.set('');
			} else {
				this.unlockError.set('Неверный PIN');
			}
		});
	}

	openSystem(event: MouseEvent): void {
		event.preventDefault();
		const internals = (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] as
			{ invoke?: (command: string) => Promise<unknown> } | undefined;

		if (internals?.invoke) {
			void internals.invoke('open_system_window');
		} else {
			location.href = '/app/system';
		}
	}

	openChangelog(): void {
		const internals = (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] as
			{ invoke?: (command: string) => Promise<unknown> } | undefined;

		if (internals?.invoke) {
			void internals.invoke('open_changelog');
		} else {
			location.href = '/changelog';
		}

		this.menuOpen.set(false);
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
	readonly mainNav = computed(() => {
		const items = MAIN_NAV.map((item) => ({ ...item, label: this.i18n.t(item.labelKey) }));

		if (this.roles.isAdmin()) {
			items.push({
				labelKey: 'nav.blog',
				link: '/app/blog',
				icon: '@tui.newspaper',
				label: this.i18n.t('nav.blog'),
			});
		}
		if (this.roles.canViewSecurity()) {
			items.push({
				labelKey: 'nav.security',
				link: '/app/security',
				icon: '@tui.shield-check',
				label: this.i18n.t('nav.security'),
			});
		}

		return items;
	});

	readonly twitch = toSignal(
		timer(0, 30000).pipe(
			switchMap(() => this.twitchService.login().pipe(catchError(() => of(null)))),
		),
		{ initialValue: null },
	);

	readonly initials = computed(() =>
		(this.twitch()?.user?.displayName ?? 'NS').slice(0, 2).toUpperCase(),
	);

	readonly steamMe = toSignal(this.steam.me().pipe(catchError(() => of(null))), {
		initialValue: null as SteamMe | null,
	});

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
	readonly catVisible = signal(false);
	readonly catTalking = signal(false);
	readonly catStage = signal(0);
	readonly idleCharacter = this.appSettings.idleCharacter;
	readonly customCharacter = this.appSettings.customCharacter;
	private readonly catDelays = [30 * 60_000, 60 * 60_000, 120 * 60_000];
	readonly catPhrase = computed(() => {
		const catPhrases = [
			'Мяу. Ты уже полчаса ничего не делаешь, а стрим не запущен. Может, начнём?',
			'Я уже сам пришёл и готов запустить стрим. Ну же, нажми кнопку!',
			'Я уже состарился, пока ждал. Ты хочешь, чтобы аудитория умерла от старости?',
		];
		const warrantPhrases = [
			'Товарищ стример! Полчаса без эфира. Пора начинать!',
			'Я уже принёс ноутбук. Стрим будет или как?',
			'Я уже состарился на службе, а аудитория — тем более. Начинай стрим!',
		];
		const phrases = this.idleCharacter() === 'warrant' ? warrantPhrases : catPhrases;

		return phrases[Math.max(0, this.catStage() - 1)] ?? phrases[2];
	});

	private catTimer: ReturnType<typeof setTimeout> | undefined;
	private catCount = 0;
	readonly loggedIn = computed(() => Boolean(this.twitch()?.valid));
	readonly unreadCount = this.alerts.unreadCount;
	private wasLoggedIn = false;
	private loginEventShown = false;

	setupIdleCat(): void {
		const reset = (event?: Event): void => {
			const target = event?.target;

			if (this.catVisible() || (target instanceof Element && target.closest('.idle-cat'))) {
				return;
			}

			this.catVisible.set(false);
			this.catTalking.set(false);
			this.setCatTray(false);
			window.speechSynthesis?.cancel();
			this.scheduleCat();
		};

		for (const event of ['keydown', 'click', 'scroll', 'touchstart']) {
			document.addEventListener(event, (domEvent: Event) => reset(domEvent), { passive: true });
		}

		this.scheduleCat();
	}

	private scheduleCat(): void {
		if (this.catTimer) {
			clearTimeout(this.catTimer);
		}

		if (!this.appSettings.idleCat() || this.streamOnline()) {
			return;
		}

		const stage = Math.min(3, this.catStage() + 1);
		const delay = this.catDelays[Math.min(2, stage - 1)] ?? this.catDelays[2];

		this.catTimer = setTimeout(() => {
			if (this.streamOnline()) {
				this.scheduleCat();

				return;
			}

			this.catCount = stage;
			this.catStage.set(stage);
			this.catVisible.set(true);
			this.setCatTray(true);
			this.notifyCat(stage);
			this.speakCat(this.catPhrase());
		}, delay);
	}

	private listenCatSummon(): void {
		const summon = (): void => {
			this.catCount = 1;
			this.catStage.set(1);
			this.catVisible.set(true);
			this.setCatTray(true);
			this.notifyCat(1);
			this.speakCat(this.catPhrase());
		};

		window.addEventListener('streamhata-cat-summon', summon);
		const globalTauri = (window as unknown as Record<string, unknown>)['__TAURI__'] as
			{ event?: { listen?: (event: string, handler: () => void) => Promise<unknown> } } | undefined;

		void globalTauri?.event?.listen?.('cat-summon', summon);
	}

	private setCatTray(active: boolean): void {
		const internals = (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] as
			| { invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown> }
			| undefined;

		void internals?.invoke?.('set_cat_tray', { active });
	}

	private notifyCat(stage: number): void {
		const internals = (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] as
			| { invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown> }
			| undefined;

		void internals?.invoke?.('notify_cat', { stage });
	}

	private stopIdleCat(): void {
		if (this.catTimer) {
			clearTimeout(this.catTimer);
			this.catTimer = undefined;
		}

		this.catVisible.set(false);
		this.catTalking.set(false);
		this.setCatTray(false);
		window.speechSynthesis?.cancel();
	}

	hideCat(): void {
		this.catVisible.set(false);
		this.catTalking.set(false);
		this.setCatTray(false);
		window.speechSynthesis?.cancel();
		this.scheduleCat();
	}

	private speakCat(text: string): void {
		if (!('speechSynthesis' in window)) {
			return;
		}

		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		const voices = window.speechSynthesis.getVoices();
		const voice = voices.find((item) => item.lang.toLowerCase().startsWith('ru'));

		if (voice) {
			utterance.voice = voice;
		}

		utterance.lang = 'ru-RU';
		utterance.rate = 0.95;
		utterance.pitch = this.idleCharacter() === 'warrant' ? 0.8 : 1.15;
		utterance.volume = 0.9;
		utterance.onstart = () => this.catTalking.set(true);
		utterance.onend = () => this.catTalking.set(false);
		utterance.onerror = () => this.catTalking.set(false);
		window.speechSynthesis.speak(utterance);
	}

	preloadProfile(): void {
		this.profileData.load().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
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
		...FAQ_ITEMS.map((item) => ({
			id: `faq-${item.id}`,
			group: 'faq' as const,
			title: item.question,
			subtitle: `FAQ · ${item.category}`,
			icon: '@tui.circle-help',
			link: `/faq?q=${encodeURIComponent(item.question)}`,
			keywords: `${item.question} ${item.keywords ?? ''} ${item.paragraphs.join(' ')} ${item.steps?.join(' ') ?? ''}`,
		})),
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
		searchFaq: this.i18n.t('search.faq'),
		searchHint: this.i18n.t('search.hint'),
	}));

	private readonly discussionNotifications = inject(DiscussionNotificationsService);

	constructor() {
		void this.systemAlerts;
		void this.suggestionNotifications;
		void this.autoClips;
		void this.messagingNotifications;
		void this.discussionNotifications;
		void this.obsAutoScene;
		this.messagingPresence.start();
		this.streamReports.start();
		this.hotkeys.start();
		timer(0, 15_000)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.appLock.checkIdle());
		window.addEventListener('pointerdown', () => this.appLock.touch(), { passive: true });
		window.addEventListener('keydown', () => this.appLock.touch());
		effect(() => {
			const user = this.twitch()?.user;
			if (!this.desktop || !user?.username || this.savedAccount === user.username) {
				return;
			}
			this.savedAccount = user.username;
			void this.accounts.saveCurrent(user.username, user.displayName || user.username);
		});
		if (this.desktop) {
			this.setupIdleCat();
			this.listenCatSummon();
			effect(() => {
				if (!this.appSettings.idleCat() || this.streamOnline()) {
					this.stopIdleCat();
				} else {
					this.scheduleCat();
				}
			});
		}

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
				this.alerts
					.notify('login', name, 'Вход выполнен')
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe({ error: () => undefined });
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
					.pipe(takeUntilDestroyed(this.destroyRef))
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
