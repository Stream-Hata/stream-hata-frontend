import type { TranslationKey } from '@shared/services/i18n.service';
import type { NotifySettings } from '@shared/types/stream';
import { Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { contrastRatio } from '@shared/helpers/color';
import { signalControl } from '@shared/helpers/form-control';
import { AppSettingsService } from '@shared/services/app-settings.service';
import { DonationsService } from '@shared/services/donations.service';
import { I18nService } from '@shared/services/i18n.service';
import { OnboardingService } from '@shared/services/onboarding.service';
import { DesktopUpdateService } from '@shared/services/desktop-update.service';
import { IntegrationsService } from '@shared/services/integrations.service';
import { MetricsService, NetworkService } from '@shared/services/ops.services';
import { NotifyService } from '@shared/services/stream.services';
import { WelcomeService } from '@shared/services/welcome.service';
import { TwitchService } from '@shared/services/twitch.service';
import {
	TuiButton,
	TuiDropdown,
	TuiIcon,
	TuiInput,
	TuiSelectLike,
	tuiItemsHandlersProvider,
	TuiSlider,
	TuiTextfield,
} from '@taiga-ui/core';
import {
	TuiBadge,
	TuiButtonCopy,
	TuiDataListWrapper,
	TuiInputColor,
	TuiInputFiles,
	TuiInputFilesDirective,
	TuiSegmented,
	TuiSwitch,
	TuiTabs,
	TuiTextarea,
} from '@taiga-ui/kit';
import { catchError, map, of, switchMap, timer } from 'rxjs';

type Section =
	| 'about'
	| 'general'
	| 'appearance'
	| 'twitch'
	| 'jury'
	| 'widgets'
	| 'notifications'
	| 'accessibility'
	| 'integrations'
	| 'network';

const SELECT_LABELS: Record<string, string> = {
	ru: 'Русский',
	en: 'English',
	msk: 'UTC+3 · Москва',
	london: 'UTC+0 · Лондон',
	ny: 'UTC−5 · Нью-Йорк',
	15: '15 секунд',
	30: '30 секунд',
	60: '60 секунд',
	5: '5 голосов',
	10: '10 голосов',
	25: '25 голосов',
};

const SECTION_DEFS: { id: Section; labelKey: TranslationKey; icon: string }[] = [
	{ id: 'general', labelKey: 'settings.general', icon: '@tui.globe' },
	{ id: 'appearance', labelKey: 'settings.appearance', icon: '@tui.palette' },
	{ id: 'twitch', labelKey: 'settings.twitch', icon: 'twitch' },
	{ id: 'jury', labelKey: 'settings.jury', icon: '@tui.messages-square' },
	{ id: 'widgets', labelKey: 'settings.widgets', icon: '@tui.blocks' },
	{ id: 'notifications', labelKey: 'settings.notifications', icon: '@tui.bell' },
	{ id: 'integrations', labelKey: 'settings.integrations', icon: '@tui.plug' },
	{ id: 'accessibility', labelKey: 'settings.accessibility', icon: '@tui.accessibility' },
	{ id: 'network', labelKey: 'settings.network', icon: '@tui.wifi' },
	{ id: 'about', labelKey: 'settings.about', icon: '@tui.info' },
];

@Component({
	imports: [
		ReactiveFormsModule,
		RouterLink,
		TuiBadge,
		TuiButton,
		TuiButtonCopy,
		TuiDataListWrapper,
		TuiDropdown,
		TuiIcon,
		TuiInput,
		TuiInputColor,
		TuiInputFiles,
		TuiInputFilesDirective,
		TuiSegmented,
			TuiSelectLike,
		TuiSlider,
		TuiSwitch,
		TuiTabs,
		TuiTextarea,
		TuiTextfield,
	],
	selector: 'app-settings-page',
	providers: [
		tuiItemsHandlersProvider({
			stringify: signal((value: string) => SELECT_LABELS[value] ?? value),
		}),
	],
	styleUrl: './settings-page.scss',
	templateUrl: './settings-page.html',
})
export default class SettingsPage {
	readonly i18n = inject(I18nService);
	readonly onboarding = inject(OnboardingService);
	readonly desktopUpdate = inject(DesktopUpdateService);
	private readonly injector = inject(Injector);
	private readonly welcomeService = inject(WelcomeService);
	readonly desktop = navigator.userAgent.includes('NamelessStreamHataDesktop') || '__TAURI_INTERNALS__' in window;
	readonly section = signal<Section>('general');
	readonly language = this.i18n.language;
	readonly languageControl = signalControl(this.language, this.injector);

	readonly labels = computed(() => ({
		title: this.i18n.t('settings.title'),
		subtitle: this.i18n.t('settings.subtitle'),
		general: this.i18n.t('settings.general'),
		language: this.i18n.t('settings.language'),
		languageHint: this.i18n.t('settings.languageHint'),
		timezone: this.i18n.t('settings.timezone'),
		autoOpen: this.i18n.t('settings.autoOpen'),
		autoOpenHint: this.i18n.t('settings.autoOpenHint'),
		reset: this.i18n.t('settings.reset'),
		resetAll: this.i18n.t('settings.resetAll'),
		network: this.i18n.t('settings.network'),
		proxy: this.i18n.t('settings.proxy'),
		proxyHint: this.i18n.t('settings.proxyHint'),
		metrics: this.i18n.t('settings.metrics'),
	}));

	readonly sections = computed(() =>
		SECTION_DEFS.map((item) => ({ ...item, label: this.i18n.t(item.labelKey) })),
	);

	readonly activeIndex = computed(() =>
		Math.max(
			0,
			this.sections().findIndex((item) => item.id === this.section()),
		),
	);

	/* General */
	readonly timezone = signal('msk');
	readonly timezoneControl = signalControl(this.timezone, this.injector);
	readonly languageValues = ['ru', 'en'];
	readonly languageLabels = ['Русский', 'English'];
	readonly timezoneValues = ['msk', 'london', 'ny'];
	readonly timezoneLabels = ['UTC+3 · Москва', 'UTC+0 · Лондон', 'UTC−5 · Нью-Йорк'];
	readonly durationValues = ['15', '30', '60'];
	readonly durationLabels = ['15 секунд', '30 секунд', '60 секунд'];
	readonly quorumValues = ['5', '10', '25'];
	readonly quorumLabels = ['5 голосов', '10 голосов', '25 голосов'];
	readonly autoOpen = signal(true);
	readonly autoOpenControl = signalControl(this.autoOpen, this.injector);

	readonly appSettings = inject(AppSettingsService);
	readonly saved = signal(false);
	readonly backgroundImage = this.appSettings.backgroundImage;
	readonly backgroundFileControl = new FormControl<File | null>(null);
	readonly characterFileControl = new FormControl<File | null>(null);
	readonly welcomeEnabled = signal(true);
	readonly welcomeMessages = signal<string[]>([]);
	readonly welcomeText = signal('');
	readonly welcomeFileControl = new FormControl<File | null>(null);
	readonly welcomeSaved = signal(false);

	disableVirusMode(): void {
		void this.onboarding.disableVirusMode();
	}

	onBackgroundFile(file: File | null): void {
		if (!file || !file.type.startsWith('image/')) {
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			const image = new Image();
			image.onload = () => {
				const max = 1920;
				const scale = Math.min(1, max / Math.max(image.width, image.height));
				const canvas = document.createElement('canvas');
				canvas.width = Math.round(image.width * scale);
				canvas.height = Math.round(image.height * scale);
				const context = canvas.getContext('2d');
				context?.drawImage(image, 0, 0, canvas.width, canvas.height);
				this.appSettings.backgroundImage.set(canvas.toDataURL('image/jpeg', 0.82));
			};
			image.src = String(reader.result);
		};
		reader.readAsDataURL(file);
	}

	clearBackground(): void {
		this.appSettings.backgroundImage.set('');
	}

	saveSettings(): void {
		this.appSettings.saveNow().subscribe(() => {
			this.saved.set(true);
			setTimeout(() => this.saved.set(false), 1800);
		});
	}

	readonly characterIndex = computed(() => ['warrant', 'cat', 'custom'].indexOf(this.appSettings.idleCharacter()));

	setCharacter(index: number): void {
		const character = (['warrant', 'cat', 'custom'] as const)[index] ?? 'warrant';
		this.appSettings.idleCharacter.set(character);
	}

	onCharacterFile(file: File | null): void {
		if (!file || !file.type.startsWith('image/')) {
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			this.appSettings.customCharacter.set(String(reader.result));
			this.appSettings.idleCharacter.set('custom');
		};
		reader.readAsDataURL(file);
	}

	summonCat(): void {
		window.dispatchEvent(new Event('streamhata-cat-summon'));
	}

	toggleIdleCat(): void {
		this.appSettings.idleCat.update((value) => !value);
	}

	toggleSidebarHeader(): void {
		this.appSettings.showSidebarHeader.update((value) => !value);
	}

	setSidebarHeader(value: boolean): void {
		this.appSettings.showSidebarHeader.set(value);
	}

	onVirusSwitch(): void {
		if (!this.onboarding.virusMode()) {
			return;
		}

		try {
			this.appSettings.saveNow().subscribe();
		} catch {
			// Settings are still persisted locally.
		}

		void this.onboarding.disableVirusMode();
	}

	/* Appearance */
	readonly theme = this.appSettings.theme;
	readonly density = this.appSettings.density;
	readonly fontScale = this.appSettings.fontScale;
	readonly accent = this.appSettings.accent;
	readonly accentDraft = signal(this.appSettings.accent());
	readonly donationError = signal('');
	readonly accentDraftControl = signalControl(this.accentDraft, this.injector);
	readonly searchHotkey = this.appSettings.searchHotkey;
	readonly searchHotkeyControl = signalControl(this.searchHotkey, this.injector);
	readonly searchHotkeyValues = ['both', 'ctrl+f', 'alt+k', 'ctrl+k'];
	readonly searchHotkeyLabels = ['Ctrl+F и Alt+K', 'Только Ctrl+F', 'Только Alt+K', 'Ctrl+K'];
	readonly accentError = signal(false);
	readonly accentPresets = ['#FF2EA6', '#22E0FF', '#FFE14D', '#2EE6A8', '#7C5CFF', '#FF8A3D'];
	readonly accentDraftContrast = computed(() =>
		contrastRatio(this.accentDraft(), '#0F0817').toFixed(1),
	);

	readonly themeIndex = computed(() => ['dark', 'light', 'system'].indexOf(this.theme()));
	readonly densityIndex = computed(() => ['compact', 'default'].indexOf(this.density()));

	/* Jury */
	readonly threshold = signal(60);
	readonly duration = signal('30');
	readonly durationControl = signalControl(this.duration, this.injector);
	readonly quorum = signal('10');
	readonly quorumControl = signalControl(this.quorum, this.injector);

	/* Widgets */
	readonly autoWidgets = signal(true);
	readonly autoWidgetsControl = signalControl(this.autoWidgets, this.injector);
	readonly showBrand = signal(true);
	readonly showBrandControl = signalControl(this.showBrand, this.injector);

	/* Notifications */
	readonly notifyVotes = signal(true);
	readonly notifyVotesControl = signalControl(this.notifyVotes, this.injector);
	readonly notifyEvents = signal(true);
	readonly notifyEventsControl = signalControl(this.notifyEvents, this.injector);
	readonly notifyWidgetErrors = signal(true);
	readonly notifyWidgetErrorsControl = signalControl(this.notifyWidgetErrors, this.injector);
	readonly digest = signal(true);
	readonly digestControl = signalControl(this.digest, this.injector);
	readonly emailChannel = signal(false);
	readonly emailChannelControl = signalControl(this.emailChannel, this.injector);
	readonly discordChannel = signal(false);
	readonly discordChannelControl = signalControl(this.discordChannel, this.injector);
	readonly notifyEnabled = signal(false);
	readonly notifyEnabledControl = signalControl(this.notifyEnabled, this.injector);
	readonly discordWebhook = signal('');
	readonly telegramToken = signal('');
	readonly telegramChatId = signal('');
	readonly notifySaved = signal(false);
	readonly notifyError = signal<string | null>(null);
	readonly proxyUrl = signal('');
	readonly proxyEnabled = signal(false);
	readonly proxyEnabledControl = signalControl(this.proxyEnabled, this.injector);
	readonly networkSaved = signal(false);
	readonly metricsSent = signal(false);

	private readonly destroyRef = inject(DestroyRef);
	private readonly notify = inject(NotifyService);
	private readonly network = inject(NetworkService);
	private readonly metricsService = inject(MetricsService);
	private readonly twitchService = inject(TwitchService);
	readonly twitch = toSignal(
		timer(0, 30000).pipe(
			switchMap(() => this.twitchService.login().pipe(catchError(() => of(null)))),
		),
		{ initialValue: null },
	);

	readonly twitchConnected = computed(() => Boolean(this.twitch()?.valid));
	readonly twitchName = computed(() => this.twitch()?.user?.displayName ?? 'не подключён');
	readonly twitchFollowers = computed(() => this.twitch()?.state?.followers ?? 0);
	readonly twitchSubscribers = computed(() => this.twitch()?.state?.subscribers ?? 0);
	readonly metrics = toSignal(
		timer(0, 10000).pipe(
			switchMap(() => this.metricsService.get().pipe(catchError(() => of(null)))),
		),
		{ initialValue: null },
	);

	private currentNotify: NotifySettings | null = null;
	private notifyLoaded = false;

	constructor() {
		const requested = inject(ActivatedRoute).snapshot.queryParamMap.get('section');

		if (requested && SECTION_DEFS.some((item) => item.id === requested)) {
			this.section.set(requested as Section);
		}

		this.network
			.get()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (settings) => {
					this.proxyUrl.set(settings.proxyUrl);
					this.proxyEnabled.set(settings.enabled);
				},
				error: () => undefined,
			});

		this.notify
			.settings()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (settings) => this.applyNotify(settings),
				error: () => undefined,
			});

		this.accentDraftControl.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((value) => this.setAccent(value));

		this.digestControl.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.saveNotify());

		this.notifyEnabledControl.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.saveNotify());

		this.backgroundFileControl.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((file) => this.onBackgroundFile(file));

		this.characterFileControl.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((file) => this.onCharacterFile(file));

		this.welcomeService.get().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: (config) => {
				this.welcomeEnabled.set(config.enabled);
				this.welcomeMessages.set(config.messages);
				this.welcomeText.set(config.messages.join('\n'));
			},
			error: () => undefined,
		});

		this.welcomeFileControl.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((file) => this.onWelcomeFile(file));
	}

	onWelcomeFile(file: File | null): void {
		if (!file) return;

		const reader = new FileReader();
		reader.onload = () => {
			const lines = String(reader.result ?? '')
				.split(/\r?\n/)
				.map((line) => line.trim())
				.filter(Boolean);
			if (!lines.length) return;
			const next = [...this.welcomeMessages(), ...lines];
			this.welcomeMessages.set(next);
			this.welcomeText.set(next.join('\n'));
		};
		reader.readAsText(file);
	}

	saveWelcome(): void {
		const messages = this.welcomeText()
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean);
		this.welcomeService.save({ enabled: this.welcomeEnabled(), messages }).subscribe({
			next: (config) => {
				this.welcomeMessages.set(config.messages);
				this.welcomeText.set(config.messages.join('\n'));
				this.welcomeSaved.set(true);
				setTimeout(() => this.welcomeSaved.set(false), 1800);
			},
			error: () => undefined,
		});
	}

	private applyNotify(settings: NotifySettings): void {
		if (this.notifyLoaded) {
			return;
		}

		this.notifyLoaded = true;
		this.currentNotify = settings;
		this.notifyEnabled.set(settings.enabled);
		this.discordWebhook.set(settings.discordWebhook);
		this.telegramToken.set(settings.telegramToken);
		this.telegramChatId.set(settings.telegramChatId);
		this.digest.set(settings.digest);
	}

	saveNotify(): void {
		const current = this.currentNotify;

		if (!current) {
			return;
		}

		this.notify
			.save({
				...current,
				enabled: this.notifyEnabled(),
				discordWebhook: this.discordWebhook(),
				telegramToken: this.telegramToken(),
				telegramChatId: this.telegramChatId(),
				digest: this.digest(),
			})
			.subscribe((settings) => {
				this.currentNotify = settings;
				this.notifySaved.set(true);

				timer(1500)
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe(() => this.notifySaved.set(false));
			});
	}

	testNotify(): void {
		this.notifyError.set(null);
		this.notify.test().subscribe({
			next: () => this.flash(this.notifySaved),
			error: (response) => this.notifyError.set(response.error?.error ?? 'Не удалось отправить сообщение'),
		});
	}

	loadTelegramChats(): void {
		this.notifyError.set(null);
		this.notify.chats().subscribe({
			next: (response) => {
				if (response.chats.length === 1) {
					this.telegramChatId.set(String(response.chats[0].id));
				} else if (response.chats.length > 1) {
					this.telegramChatId.set(String(response.chats[0].id));
				} else {
					this.notifyError.set('Бот не видел ни одного чата. Напиши боту /start в Telegram.');
				}
			},
			error: (response) => this.notifyError.set(response.error?.error ?? 'Не удалось получить чаты Telegram'),
		});
	}

	saveNetwork(): void {
		this.network
			.save({ proxyUrl: this.proxyUrl(), enabled: this.proxyEnabled() })
			.subscribe(() => this.flash(this.networkSaved));
	}

	testNetwork(): void {
		this.network.test().subscribe();
	}

	sendMetrics(): void {
		this.metricsService.sendTelegram().subscribe(() => this.flash(this.metricsSent));
	}

	private flash(flag: import('@angular/core').WritableSignal<boolean>): void {
		flag.set(true);

		timer(1500)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => flag.set(false));
	}

	/* Accessibility */
	readonly reducedMotion = this.appSettings.reducedMotion;
	readonly reducedMotionControl = signalControl(this.reducedMotion, this.injector);
	readonly highContrast = this.appSettings.highContrast;
	readonly highContrastControl = signalControl(this.highContrast, this.injector);
	readonly textSize = this.appSettings.textSize;
	readonly textSizeIndex = computed(() => ['s', 'm', 'l'].indexOf(this.textSize()));

	/* Интеграции */
	private readonly integrationsService = inject(IntegrationsService);
	private readonly donationsService = inject(DonationsService);
	readonly donationAlertsState = toSignal(
		timer(0, 5000).pipe(
			switchMap(() =>
				this.donationsService.getSnapshot().pipe(
					map((snapshot) => snapshot.providers.find((provider) => provider.name === 'donationalerts') ?? null),
					catchError(() => of(null)),
				),
			),
		),
		{ initialValue: null },
	);

	readonly webhookProviders = ['kofi', 'donationto', 'donatestream', 'donatepay', 'generic'];

	readonly integrations = toSignal(
		timer(0, 5000).pipe(
			switchMap(() =>
				this.integrationsService.list().pipe(
					map((response) => response.integrations),
					catchError(() => of([])),
				),
			),
		),
		{ initialValue: [] },
	);

	toggleIntegration(id: string, event: Event): void {
		this.integrationsService.setEnabled(id, this.check(event)).subscribe();
	}

	webhookUrl(provider: string): string {
		return this.integrationsService.webhookUrl(provider);
	}

	connectDonationAlerts(): void {
		this.donationError.set('');
		this.donationsService.getDonationAlertsAuthUrl().subscribe({
			next: ({ url }) => location.assign(url),
			error: (response) => this.donationError.set(response.error?.error ?? 'DonationAlerts не настроен'),
		});
	}

	setAccent(value: string): void {
		if (!value) {
			return;
		}

		this.accentDraft.set(value);
		this.accentError.set(!this.appSettings.tryAccent(value));
	}

	fixAccent(): void {
		this.appSettings.applyNearestAccent(this.accentDraft());
		this.accentDraft.set(this.appSettings.accent());
		this.accentError.set(false);
	}

	setTheme(index: number): void {
		this.theme.set((['dark', 'light', 'system'] as const)[index] ?? 'dark');
	}

	setDensity(index: number): void {
		this.density.set(index === 0 ? 'compact' : 'default');
	}

	connectTwitch(): void {
		this.twitchService.connect();
	}

	disconnectTwitch(): void {
		this.twitchService.disconnect().subscribe(() => location.assign('/login'));
	}

	setTextSize(index: number): void {
		this.textSize.set((['s', 'm', 'l'] as const)[index] ?? 'm');
	}

	check(event: Event): boolean {
		return (event.target as HTMLInputElement).checked;
	}

	value(event: Event): string {
		return (event.target as HTMLSelectElement).value;
	}

	selectSection(index: number): void {
		this.section.set(this.sections()[index]?.id ?? 'general');
	}
}
