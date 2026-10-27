import type { WidgetConfig } from '@shared/services/widgets.service';
import type { AlertEvent, AlertSettings } from '@shared/types/automation';
import { Component, computed, DestroyRef, effect, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HotbarStore } from '@app/stores/hotbar.store';
import { signalControl } from '@shared/helpers/form-control';
import { AlertsService } from '@shared/services/alerts.service';
import { WidgetConfigService } from '@shared/services/widgets.service';
import {
	TuiButton,
	TuiDropdown,
	TuiIcon,
	TuiInput,
	tuiItemsHandlersProvider,
	TuiSelectLike,
	TuiSlider,
	TuiTextfield,
} from '@taiga-ui/core';
import {
	TuiBadge,
	TuiChevron,
	TuiDataListWrapper,
	TuiInputColor,
	TuiInputNumber,
	TuiSegmented,
	TuiSwitch,
} from '@taiga-ui/kit';
import { catchError, map, of, switchMap, timer } from 'rxjs';
import { Timer } from '../../hotbar/timer/timer';
import { AlertPreview } from '../../widgets/alert-preview/alert-preview';
import { DonationConfig } from '../../widgets/donation-config/donation-config';
import { RouletteConfigForm } from '../../widgets/roulette-config/roulette-config';
import { HotbarConfig } from '../../widgets/hotbar-config/hotbar-config';
import { HotbarPreview } from '../../widgets/hotbar-preview/hotbar-preview';

const STYLE_LABELS: Record<string, string> = {
	standard: 'Standard',
	compact: 'Compact',
	minimal: 'Minimal',
};

const KIND_TITLES: Record<string, string> = {
	jury: 'Chat Jury',
	timer: 'Timer',
	hotbar: 'Hotbar',
	roulette: 'Roulette',
	alerts: 'Alerts',
	events: 'Event List',
	donations: 'Donations',
	audio: 'Audio',
	wheel: 'Wheel',
	chat: 'Chat',
	points: 'Top Points',
	music: 'Audio list',
	nowplaying: 'Now Playing',
	streaks: 'Watch Streak',
};

@Component({
	imports: [ReactiveFormsModule, RouterLink, TuiBadge, TuiButton, TuiChevron, TuiDataListWrapper, TuiDropdown, TuiIcon, TuiInput, TuiInputColor, TuiInputNumber, TuiSegmented, TuiSelectLike, TuiSlider, TuiSwitch, TuiTextfield, AlertPreview, DonationConfig, HotbarConfig, HotbarPreview, RouletteConfigForm, Timer],
	selector: 'app-widget-config-page',
	providers: [
		tuiItemsHandlersProvider({
			stringify: signal((value: string) => STYLE_LABELS[value] ?? value),
		}),
	],
	styleUrl: './widget-config-page.scss',
	templateUrl: './widget-config-page.html',
})
export default class WidgetConfigPage {
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);
	private readonly injector = inject(Injector);
	private readonly widgetConfig = inject(WidgetConfigService);
	private readonly store = inject(HotbarStore);
	readonly genericKinds = ['audio', 'wheel', 'chat', 'points', 'music', 'nowplaying', 'streaks'];
	readonly isGeneric = computed(() => this.genericKinds.includes(this.kind()));
	readonly genericConfig = signal<WidgetConfig>({});
	readonly hotbarConfig = signal<WidgetConfig>({});
	readonly genericForm = new FormGroup({
		transparent: new FormControl(true, { nonNullable: true }),
		backgroundColor: new FormControl('#121218', { nonNullable: true }),
		textColor: new FormControl('#F5EAFF', { nonNullable: true }),
		accentColor: new FormControl('#FF2EA6', { nonNullable: true }),
		scale: new FormControl(1, { nonNullable: true }),
		title: new FormControl('', { nonNullable: true }),
		maxRows: new FormControl(5, { nonNullable: true }),
		showEmotes: new FormControl(true, { nonNullable: true }),
		showTimestamps: new FormControl(true, { nonNullable: true }),
		streakMin: new FormControl(2, { nonNullable: true }),
		streakEvery: new FormControl(5, { nonNullable: true }),
		durationSeconds: new FormControl(10, { nonNullable: true }),
		showVideo: new FormControl(true, { nonNullable: true }),
		showControls: new FormControl(true, { nonNullable: true }),
		juryYeaColor: new FormControl('#22c55e', { nonNullable: true }),
		juryNeiColor: new FormControl('#ef4444', { nonNullable: true }),
		juryShowTimer: new FormControl(true, { nonNullable: true }),
	});

	constructor() {
		effect(() => {
			const url = this.timerFontUrl();
			const id = 'nsh-timer-font-face';
			const existing = document.getElementById(id);

			if (!url) {
				existing?.remove();

				return;
			}

			const style = existing ?? document.createElement('style');

			style.id = id;
			style.textContent = `@font-face{font-family:'NSH Custom Timer Font';src:url('${url}');font-display:swap;}`;

			if (!existing) {
				document.head.append(style);
			}
		});

		this.genericForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
			this.genericConfig.update((config) => ({ ...config, ...value }));
		});

		this.widgetConfig
			.get(this.kind())
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					this.genericConfig.set(response.config);
					this.hotbarConfig.set(response.config);
					this.genericForm.patchValue(response.config, { emitEvent: false });
					this.applyJurySettings(response.config);
					this.applyTimerSettings(response.config);
				},
				error: () => undefined,
			});

		this.alertsService
			.getState()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (state) => this.applyAlertSettings(state.settings),
				error: () => undefined,
			});

		this.alertTypeForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((types) => {
			this.alertTypes.set(types as Record<string, boolean>);
			this.saveAlertSettings();
		});

		this.alertSoundEnabledControl.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.saveAlertSettings());
	}

	private applyJurySettings(config: WidgetConfig): void {
		if (this.kind() !== 'jury') {
			return;
		}

		this.juryStyle.set(config.juryStyle ?? 'standard');
		this.juryStyleControl.setValue(this.juryStyle(), { emitEvent: false });
		this.theme.set(config.juryTheme ?? 'dark');
		this.density.set(config.juryDensity ?? 'm');
		this.showChannel.set(config.juryShowChannel !== false);
		this.showChannelControl.setValue(this.showChannel(), { emitEvent: false });
		this.showQuestion.set(config.juryShowQuestion !== false);
		this.showQuestionControl.setValue(this.showQuestion(), { emitEvent: false });
		this.showAuthors.set(config.juryShowAuthors !== false);
		this.showAuthorsControl.setValue(this.showAuthors(), { emitEvent: false });
		this.showProgress.set(config.juryShowProgress !== false);
		this.showProgressControl.setValue(this.showProgress(), { emitEvent: false });
		this.animation.set(config.juryAnimation !== false);
		this.animationControl.setValue(this.animation(), { emitEvent: false });
		this.speed.set(config.jurySpeed ?? 40);
	}

	private applyTimerSettings(config: WidgetConfig): void {
		if (this.kind() !== 'timer') {
			return;
		}

		const mode = config.timerMode ?? 'countdown';
		const label =
			config.timerLabel ?? (mode === 'countdown' ? 'До старта события' : 'Прошло времени');

		this.timerMode.set(mode);
		this.labelText.set(
			mode === 'count-up' && label === 'До старта события' ? 'Прошло времени' : label,
		);
		this.labels.set(config.timerShowLabel !== false);
		this.timeSize.set(config.timerSize ?? 'large');
		this.showTimerProgress.set(config.timerShowProgress ?? mode === 'countdown');
		this.timerProgressColor.set(config.timerProgressColor ?? '#22E0FF');
		this.timerFont.set(config.timerFontFamily ?? 'JetBrains Mono');
		this.timerFontUrl.set(config.timerFontUrl ?? '');
		this.timerAlign.set(config.timerAlign ?? 'left');
		this.timerVerticalAlign.set(config.timerVerticalAlign ?? 'middle');

		const duration = config.timerDurationSeconds ?? 754;

		this.hours.set(Math.floor(duration / 3600));
		this.minutes.set(Math.floor((duration % 3600) / 60));
		this.seconds.set(duration % 60);

		const from = config.timerCountFromSeconds ?? 0;
		const to = config.timerCountToSeconds ?? null;

		this.countFromHours.set(Math.floor(from / 3600));
		this.countFromMinutes.set(Math.floor((from % 3600) / 60));
		this.countFromSeconds.set(from % 60);
		this.countUpLimit.set(to !== null);

		const limit = to ?? 0;

		this.countToHours.set(Math.floor(limit / 3600));
		this.countToMinutes.set(Math.floor((limit % 3600) / 60));
		this.countToSeconds.set(limit % 60);
	}

	private applyAlertSettings(settings: AlertSettings): void {
		if (this.alertsLoaded) {
			return;
		}

		this.alertsLoaded = true;

		this.alertTypes.set(settings.types);
		this.alertTypeForm.patchValue(settings.types, { emitEvent: false });
		this.alertDuration.set(settings.durationSeconds);
		this.alertSoundEnabled.set(settings.soundEnabled ?? true);
		this.alertSoundUrl.set(settings.soundUrl ?? '');
		this.alertSoundVolume.set(settings.soundVolume ?? 70);
	}

	readonly kind = toSignal(
		this.route.paramMap.pipe(map((params) => params.get('kind') ?? 'jury')),
		{ initialValue: 'jury' },
	);

	readonly kindTitle = computed(() => KIND_TITLES[this.kind()] ?? 'Виджет');

	/* Jury */
	readonly juryStyle = signal('standard');
	readonly juryStyleControl = signalControl(this.juryStyle, this.injector);
	readonly juryStyleValues = ['standard', 'compact', 'minimal'];
	readonly juryStyleLabels = ['Standard', 'Compact', 'Minimal'];
	readonly theme = signal<'dark' | 'light'>('dark');
	readonly density = signal<'s' | 'm' | 'l'>('m');
	readonly themeIndex = computed(() => (this.theme() === 'dark' ? 0 : 1));
	readonly densityIndex = computed(() => ['s', 'm', 'l'].indexOf(this.density()));
	readonly timerModeIndex = computed(() => (this.timerMode() === 'countdown' ? 0 : 1));
	readonly timeSizeIndex = computed(() => ['small', 'medium', 'large'].indexOf(this.timeSize()));
	readonly showChannel = signal(true);
	readonly showChannelControl = signalControl(this.showChannel, this.injector);
	readonly showQuestion = signal(true);
	readonly showQuestionControl = signalControl(this.showQuestion, this.injector);
	readonly showAuthors = signal(true);
	readonly showAuthorsControl = signalControl(this.showAuthors, this.injector);
	readonly showProgress = signal(true);
	readonly showProgressControl = signalControl(this.showProgress, this.injector);
	readonly animation = signal(true);
	readonly animationControl = signalControl(this.animation, this.injector);
	readonly speed = signal(40);

	/* Timer */
	readonly timerMode = signal<'countdown' | 'count-up'>('countdown');
	readonly labelText = signal('До старта события');
	readonly labels = signal(true);
	readonly labelsControl = signalControl(this.labels, this.injector);
	readonly hours = signal(0);
	readonly minutes = signal(12);
	readonly seconds = signal(34);
	readonly countFromHours = signal(0);
	readonly countFromMinutes = signal(0);
	readonly countFromSeconds = signal(0);
	readonly countFromHoursControl = signalControl(this.countFromHours, this.injector);
	readonly countFromMinutesControl = signalControl(this.countFromMinutes, this.injector);
	readonly countFromSecondsControl = signalControl(this.countFromSeconds, this.injector);
	readonly countUpLimit = signal(false);
	readonly countUpLimitControl = signalControl(this.countUpLimit, this.injector);
	readonly countToHours = signal(0);
	readonly countToMinutes = signal(0);
	readonly countToSeconds = signal(0);
	readonly countToHoursControl = signalControl(this.countToHours, this.injector);
	readonly countToMinutesControl = signalControl(this.countToMinutes, this.injector);
	readonly countToSecondsControl = signalControl(this.countToSeconds, this.injector);
	readonly timeSize = signal<'small' | 'medium' | 'large'>('large');
	readonly showTimerProgress = signal(true);
	readonly showTimerProgressControl = signalControl(this.showTimerProgress, this.injector);
	readonly timerProgressColor = signal('#22E0FF');
	readonly timerProgressColorControl = signalControl(this.timerProgressColor, this.injector);
	readonly timerFont = signal('JetBrains Mono');
	readonly timerFontUrl = signal('');
	readonly fontError = signal('');
	readonly timerFontFamily = computed(() =>
		this.timerFontUrl() ? 'NSH Custom Timer Font' : this.timerFont(),
	);

	readonly timerFontControl = signalControl(this.timerFont, this.injector);
	readonly timerFontValues = [
		'DSEG7-Classic',
		'DSEG7-Classic-MINI',
		'DSEG7-7SEGG',
		'DSEG14-Classic',
		'DSEG14-Modern',
		'JetBrains Mono',
		'Roboto Mono',
		'IBM Plex Mono',
		'Fira Code',
		'Space Mono',
		'Inconsolata',
		'VT323',
		'Orbitron',
		'Rajdhani',
		'Chakra Petch',
		'Exo 2',
		'Saira Stencil One',
		'Audiowide',
		'Michroma',
		'Syncopate',
		'Monoton',
		'Tektur',
		'Silkscreen',
		'Bungee',
		'Anton',
		'Archivo Black',
		'Righteous',
		'Unbounded',
		'Space Grotesk',
		'Rubik',
		'Jost',
		'Manrope',
		'Nunito',
		'Poppins',
		'Raleway',
		'Comfortaa',
		'Inter',
		'Montserrat',
		'Oswald',
		'Bebas Neue',
		'Russo One',
		'Press Start 2P',
		'Playfair Display',
		'Cinzel',
		'Lobster',
		'Pacifico',
		'Caveat',
		'Arial',
		'Georgia',
		'Courier New',
		'Impact',
		'Trebuchet MS',
		'Verdana',
		'Times New Roman',
		'Comic Sans MS',
		'Tahoma',
		'Segoe UI',
		'Palatino Linotype',
		'Lucida Console',
		'Brush Script MT',
	];

	readonly timerFontLabels = this.timerFontValues;
	readonly timerAlign = signal<'left' | 'center' | 'right'>('left');
	readonly timerVerticalAlign = signal<'top' | 'middle' | 'bottom'>('middle');
	readonly timerAlignIndex = computed(() => ['left', 'center', 'right'].indexOf(this.timerAlign()));
	readonly timerVerticalAlignIndex = computed(() =>
		['top', 'middle', 'bottom'].indexOf(this.timerVerticalAlign()),
	);

	readonly timerAlignItems = computed(() =>
		this.timerAlign() === 'left'
			? 'flex-start'
			: this.timerAlign() === 'right'
				? 'flex-end'
				: 'center',
	);

	readonly timerVerticalItems = computed(() =>
		this.timerVerticalAlign() === 'top'
			? 'flex-start'
			: this.timerVerticalAlign() === 'bottom'
				? 'flex-end'
				: 'center',
	);

	readonly timerTextColor = computed(() => this.genericConfig().textColor ?? '#F5EAFF');

	/* Events */
	readonly eventsRows = signal(4);
	readonly eventsPast = signal(false);
	readonly eventsPastControl = signalControl(this.eventsPast, this.injector);

	/* Donations */
	readonly donationMinAmount = signal(100);
	readonly donationShowMessage = signal(true);
	readonly donationShowMessageControl = signalControl(this.donationShowMessage, this.injector);
	readonly donationRows = signal(3);

	/* Alerts */
	private readonly alertsService = inject(AlertsService);

	readonly alertEvents = toSignal(
		timer(0, 5000).pipe(
			switchMap(() =>
				this.alertsService.getState().pipe(
					map((state) => state.events),
					catchError(() => of([] as AlertEvent[])),
				),
			),
		),
		{ initialValue: [] as AlertEvent[] },
	);

	readonly alertTypes = signal<Record<string, boolean>>({});
	readonly alertDuration = signal(8);
	readonly alertSoundEnabled = signal(true);
	readonly alertSoundEnabledControl = signalControl(this.alertSoundEnabled, this.injector);
	readonly alertSoundUrl = signal('');
	readonly alertSoundVolume = signal(70);

	readonly alertTypeLabels: Record<string, string> = {
		follow: 'Фолловеры',
		subscribe: 'Подписки',
		gift: 'Подарочные подписки',
		resub: 'Продления',
		cheer: 'Битсы',
		raid: 'Рейды',
		hype_train: 'Хайп-трейн',
		goal: 'Цели',
	};

	readonly alertTypeList = Object.entries(this.alertTypeLabels).map(([key, label]) => ({
		key,
		label,
	}));

	readonly alertTypeForm = new FormGroup(
		Object.fromEntries(
			this.alertTypeList.map(({ key }) => [key, new FormControl(false, { nonNullable: true })]),
		),
	);

	private alertsLoaded = false;

	setAlertDuration(event: Event): void {
		this.alertDuration.set(+(event.target as HTMLInputElement).value);
	}

	saveAlertSettings(): void {
		const settings: AlertSettings = {
			types: this.alertTypes(),
			durationSeconds: this.alertDuration(),
			soundEnabled: this.alertSoundEnabled(),
			soundUrl: this.alertSoundUrl(),
			soundVolume: this.alertSoundVolume(),
		};

		this.alertsService.saveSettings(settings).subscribe();
	}

	testAlert(type: string): void {
		this.alertsService.test(type).subscribe();
	}

	readonly saved = signal(false);
	readonly elapsed = computed(() => {
		const value = this.store.state()?.timerState.time;

		return (value?.hours ?? 0) * 3600 + (value?.minutes ?? 0) * 60 + (value?.seconds ?? 0);
	});

	readonly duration = computed(() => this.hours() * 3600 + this.minutes() * 60 + this.seconds());
	readonly countFrom = computed(
		() => this.countFromHours() * 3600 + this.countFromMinutes() * 60 + this.countFromSeconds(),
	);

	readonly countTo = computed(() =>
		this.countUpLimit()
			? this.countToHours() * 3600 + this.countToMinutes() * 60 + this.countToSeconds()
			: null,
	);

	readonly displayedSeconds = computed(() => {
		const duration = this.duration();

		if (this.timerMode() === 'countdown') {
			return Math.max(0, duration - this.elapsed());
		}

		const value = this.countFrom() + this.elapsed();
		const limit = this.countTo();

		return limit === null ? value : Math.min(value, limit);
	});

	readonly time = computed(() =>
		[this.displayedSeconds()]
			.map((seconds) => {
				const hours = Math.floor(seconds / 3600);
				const minutes = Math.floor((seconds % 3600) / 60);
				const rest = seconds % 60;

				return [hours, minutes, rest].map((value) => String(value).padStart(2, '0')).join(':');
			})
			.join(''),
	);

	readonly timerProgress = computed(() => {
		if (this.timerMode() === 'count-up') {
			const from = this.countFrom();
			const limit = this.countTo();

			if (limit === null || limit <= from) {
				return 0;
			}

			const value = Math.min(from + this.elapsed(), limit);

			return Math.max(0, Math.min(100, ((value - from) / (limit - from)) * 100));
		}

		const duration = this.duration();

		if (duration <= 0) {
			return 0;
		}

		const value = Math.max(0, duration - this.elapsed());

		return Math.max(0, Math.min(100, (value / duration) * 100));
	});

	setTheme(index: number): void {
		this.theme.set(index === 0 ? 'dark' : 'light');
	}

	setDensity(index: number): void {
		this.density.set((['s', 'm', 'l'] as const)[index] ?? 'm');
	}

	setTimerMode(index: number): void {
		const mode = index === 0 ? 'countdown' : 'count-up';
		const previousDefault = mode === 'countdown' ? 'Прошло времени' : 'До старта события';

		if (this.labelText() === previousDefault) {
			this.labelText.set(mode === 'countdown' ? 'До старта события' : 'Прошло времени');
		}

		this.timerMode.set(mode);
		this.showTimerProgress.set(mode === 'countdown');
	}

	setTimerAlign(index: number): void {
		this.timerAlign.set((['left', 'center', 'right'] as const)[index] ?? 'left');
	}

	setTimerVerticalAlign(index: number): void {
		this.timerVerticalAlign.set((['top', 'middle', 'bottom'] as const)[index] ?? 'middle');
	}

	onFontFile(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) {
			return;
		}

		if (!/\.(woff2?|ttf|otf)$/i.test(file.name)) {
			this.fontError.set('Поддерживаются woff2, woff, ttf и otf');

			return;
		}

		if (file.size > 2 * 1024 * 1024) {
			this.fontError.set('Файл больше 2 МБ');

			return;
		}

		const reader = new FileReader();

		reader.onload = () => {
			const result = String(reader.result ?? '');

			this.fontError.set('');
			this.timerFontUrl.set(result);
			this.timerFont.set('NSH Custom Timer Font');
			this.timerFontControl.setValue('NSH Custom Timer Font');
		};
		reader.onerror = () => this.fontError.set('Не удалось прочитать файл');
		reader.readAsDataURL(file);
		input.value = '';
	}

	clearFont(): void {
		this.timerFontUrl.set('');
		this.timerFont.set('JetBrains Mono');
		this.timerFontControl.setValue('JetBrains Mono');
		this.fontError.set('');
	}

	setTimeSize(index: number): void {
		this.timeSize.set((['small', 'medium', 'large'] as const)[index] ?? 'medium');
	}

	save(): void {
		const config =
			this.kind() === 'hotbar'
				? { ...this.genericConfig(), ...this.hotbarConfig() }
				: this.kind() === 'timer'
					? {
							...this.genericConfig(),
							...this.genericForm.getRawValue(),
							timerMode: this.timerMode(),
							timerLabel: this.labelText(),
							timerShowLabel: this.labels(),
							timerDurationSeconds: this.hours() * 3600 + this.minutes() * 60 + this.seconds(),
							timerCountFromSeconds:
							this.countFromHours() * 3600 + this.countFromMinutes() * 60 + this.countFromSeconds(),
							timerCountToSeconds: this.countUpLimit()
								? this.countToHours() * 3600 + this.countToMinutes() * 60 + this.countToSeconds()
								: null,
							timerSize: this.timeSize(),
							timerShowProgress: this.showTimerProgress(),
							timerProgressColor: this.timerProgressColor(),
							timerFontFamily: this.timerFont(),
							timerFontUrl: this.timerFontUrl(),
							timerAlign: this.timerAlign(),
							timerVerticalAlign: this.timerVerticalAlign(),
						}
					: { ...this.genericConfig(), ...this.genericForm.getRawValue() };

		if (this.kind() === 'jury') {
			Object.assign(config, {
				juryStyle: this.juryStyle(),
				juryTheme: this.theme(),
				juryDensity: this.density(),
				juryShowChannel: this.showChannel(),
				juryShowQuestion: this.showQuestion(),
				juryShowAuthors: this.showAuthors(),
				juryShowProgress: this.showProgress(),
				juryAnimation: this.animation(),
				jurySpeed: this.speed(),
			});
		}

		this.widgetConfig
			.save(this.kind(), config)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe();

		this.saved.set(true);

		timer(1500)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.saved.set(false));
	}
}
