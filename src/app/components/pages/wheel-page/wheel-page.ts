import type { LotMeta } from '@shared/services/lots.service';
import type {
	GamesSettings,
	WheelAppearance,
	WheelBoost,
	WheelRound,
	WheelSegment,
	WheelState,
} from '@shared/types/automation';
import { DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { luminance } from '@shared/helpers/color';
import { GamesService } from '@shared/services/engagement.services';
import { I18nService } from '@shared/services/i18n.service';
import { LotsService } from '@shared/services/lots.service';
import { MediaService } from '@shared/services/media.service';
import {
	TuiButton,
	TuiHintDirective,
	TuiIcon,
	TuiInput,
	TuiLoader,
	TuiTextfield,
} from '@taiga-ui/core';
import {
	TuiBadge,
	TuiButtonCopy,
	TuiInputColor,
	TuiInputNumber,
	TuiSegmented,
	TuiSwitch,
} from '@taiga-ui/kit';
import { catchError, of, switchMap, timer } from 'rxjs';
import { WheelBoostDialog } from './wheel-boost-dialog/wheel-boost-dialog';

const DEFAULT_SEGMENTS: WheelSegment[] = [
	{ id: 'zero', label: 'ноль', multiplier: 0, weight: 35, color: '#FF2EA6' },
	{ id: 'x1_5', label: '×1.5', multiplier: 1.5, weight: 30, color: '#22E0FF' },
	{ id: 'x2', label: '×2', multiplier: 2, weight: 20, color: '#FFE14D' },
	{ id: 'x3', label: '×3', multiplier: 3, weight: 10, color: '#7C5CFF' },
	{ id: 'x5', label: '×5', multiplier: 5, weight: 5, color: '#2EE6A8' },
];

const DEFAULT_APPEARANCE: WheelAppearance = {
	size: 380,
	background: '#0F0817',
	borderColor: '#3A3448',
	borderWidth: 6,
	glowColor: '#FF2EA6',
	glowSize: 24,
	pointerColor: '#FF2EA6',
	centerColor: '#0F0817',
	centerText: 'NS',
	centerTextColor: '#FF2EA6',
	labelColor: '#FFFFFF',
	labelSize: 16,
	labelStrokeColor: '#0F0817',
	labelStrokeWidth: 2,
	showLabels: true,
	showChances: true,
	fontFamily: '',
	fontUrl: '',
};

function arcPath(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
	const start = polar(cx, cy, radius, startAngle);
	const end = polar(cx, cy, radius, endAngle);
	const largeArc = endAngle - startAngle > 180 ? 1 : 0;

	return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
}

function polar(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
	const radians = (angle * Math.PI) / 180;

	return {
		x: cx + radius * Math.cos(radians),
		y: cy + radius * Math.sin(radians),
	};
}

@Component({
	imports: [
		DecimalPipe,
		ReactiveFormsModule,
		TuiBadge,
		TuiButton,
		TuiButtonCopy,
		TuiHintDirective,
		TuiIcon,
		TuiInput,
		TuiInputColor,
		TuiInputNumber,
		TuiLoader,
		TuiSegmented,
		TuiSwitch,
		TuiTextfield,
		WheelBoostDialog,
	],
	selector: 'app-wheel-page',
	styleUrl: './wheel-page.scss',
	templateUrl: './wheel-page.html',
})
export default class WheelPage {
	private readonly games = inject(GamesService);
	private readonly lots = inject(LotsService);
	private readonly i18n = inject(I18nService);
	private readonly media = inject(MediaService);
	private readonly destroyRef = inject(DestroyRef);
	private base: GamesSettings | null = null;
	private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
	private autoSaveStarted = false;
	private lastRoundId = '';
	private lastSpinKey = '';
	private lastSectorKey = '';
	private wheelAudio: HTMLAudioElement | null = null;

	readonly settingsForm = new FormGroup({
		mode: new FormControl<'spin' | 'elimination'>('spin'),
		labelMode: new FormControl<'lot' | 'viewer'>('lot'),
		spinDelay: new FormControl(3),
		spinCooldown: new FormControl(10),
		roundSeconds: new FormControl(60),
		minBet: new FormControl(10),
		maxBet: new FormControl(1000),
		soundUrl: new FormControl(''),
		centerUrl: new FormControl(''),
		title: new FormControl(''),
		bet: new FormControl(100),
	});

	readonly appearanceForm = new FormGroup({
		size: new FormControl(380),
		background: new FormControl('#0F0817'),
		borderColor: new FormControl('#3A3448'),
		borderWidth: new FormControl(6),
		glowColor: new FormControl('#FF2EA6'),
		glowSize: new FormControl(24),
		pointerColor: new FormControl('#FF2EA6'),
		centerColor: new FormControl('#0F0817'),
		centerText: new FormControl('NS'),
		centerTextColor: new FormControl('#FF2EA6'),
		labelColor: new FormControl('#FFFFFF'),
		labelSize: new FormControl(16),
		labelStrokeColor: new FormControl('#0F0817'),
		labelStrokeWidth: new FormControl(2),
		showLabels: new FormControl(true),
		showChances: new FormControl(true),
		fontFamily: new FormControl(''),
		fontUrl: new FormControl(''),
	});

	readonly mode = signal<'spin' | 'elimination'>('spin');
	readonly labelMode = signal<'lot' | 'viewer'>('lot');
	readonly spinDelay = signal(3);
	readonly spinCooldown = signal(10);
	readonly appearance = signal<WheelAppearance>({ ...DEFAULT_APPEARANCE });
	readonly fontFamilyCss = computed(() => {
		if (this.appearance().fontFamily.trim()) {
			return this.appearance().fontFamily.trim();
		}

		return this.appearance().fontUrl.trim() ? 'NSH Custom Wheel Font' : null;
	});

	readonly roundSeconds = signal(60);
	readonly minBet = signal(10);
	readonly maxBet = signal(1000);
	readonly segments = signal<WheelSegment[]>([]);
	readonly boosts = signal<WheelBoost[]>([
		{ value: 0, weight: 20 },
		{ value: 1, weight: 20 },
		{ value: 2, weight: 25 },
		{ value: 3, weight: 15 },
		{ value: 5, weight: 10 },
		{ value: 10, weight: 8 },
		{ value: 100, weight: 2 },
	]);

	readonly title = signal('');
	readonly bet = signal(100);
	readonly saved = signal(false);
	readonly settingsReady = signal(false);
	readonly winnerParticles = Array.from({ length: 28 }, (_, index) => ({
		left: (index * 37) % 100,
		delay: (index % 9) * 0.08,
		duration: 1.4 + (index % 5) * 0.18,
		size: 4 + (index % 4) * 2,
		color: ['#FFD166', '#FF5AA9', '#7C5CFF', '#22E0FF', '#2EE6A8'][index % 5],
	}));

	readonly isTestEnvironment =
		typeof location !== 'undefined' &&
		location.hostname === 'localhost' &&
		location.port === '4200';

	readonly boostParticipant = signal<import('@shared/types/automation').WheelParticipant | null>(null);
	readonly boostedLots = signal<Set<string>>(new Set());
	readonly flashUserId = signal<string | null>(null);
	readonly chanceFlash = signal(false);
	readonly spinning = signal(false);
	readonly hovered = signal<number | null>(null);
	readonly soundUrl = signal('');
	readonly soundError = signal('');
	readonly soundResolving = signal(false);
	readonly soundUploading = signal(false);
	readonly centerUrl = signal('');
	readonly centerError = signal('');
	readonly centerResolving = signal(false);
	readonly lotName = signal('');
	readonly lotBet = signal(100);
	readonly lotLuck = signal(false);
	readonly lotViewer = signal('');
	readonly lotType = signal('auto');
	readonly lotMeta = signal<LotMeta | null>(null);
	readonly lotMetaError = signal('');
	readonly lotMetaLoading = signal(false);
	readonly lotTypes = ['auto', 'game', 'movie', 'music'];
	readonly lotTypeLabels = ['Авто', 'Игра', 'Фильм', 'Музыка'];
	readonly lotTypeIndex = computed(() => Math.max(0, this.lotTypes.indexOf(this.lotType())));
	readonly now = signal(Date.now());
	readonly displaySegments = computed(() =>
		this.segments().length ? this.segments() : DEFAULT_SEGMENTS,
	);

	readonly modeIndex = computed(() => (this.mode() === 'spin' ? 0 : 1));
	readonly labelModeIndex = computed(() => (this.labelMode() === 'lot' ? 0 : 1));
	readonly roundState = computed(() => this.round()?.state ?? 'idle');
	readonly isElimination = computed(() => this.round()?.mode === 'elimination');
	readonly spinPending = computed(() => {
		const round = this.round();

		return !!(
			round?.state === 'spinning' &&
			round.spinAt &&
			this.now() < new Date(round.spinAt).getTime()
		);
	});

	readonly spinCooldownRemaining = computed(() => {
		const next = this.round()?.nextSpinAt;

		return next ? Math.max(0, Math.ceil((new Date(next).getTime() - this.now()) / 1000)) : 0;
	});

	readonly spinExpired = computed(() => {
		const round = this.round();

		return !!round?.spinEndsAt && this.now() >= new Date(round.spinEndsAt).getTime();
	});

	readonly wheelSpinning = computed(
		() => (this.spinning() || this.roundState() === 'spinning') && !this.spinPending(),
	);

	readonly statusLabel = computed(() => {
		switch (this.roundState()) {
			case 'collecting':
				return 'Сбор ставок';
			case 'spinning':
				return 'Крутится';
			case 'finished':
				return 'Завершено';
			default:
				return 'Ожидание';
		}
	});

	readonly countdown = computed(() => {
		const round = this.round();

		if (!round || round.state !== 'collecting') {
			return '—';
		}

		const remaining = Math.max(0, new Date(round.deadline).getTime() - this.now());

		return `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;
	});

	readonly winnerName = computed(() => {
		const winner = this.round()?.winner;

		if (!winner) {
			return '—';
		}

		return this.labelMode() === 'viewer'
			? winner.displayName
			: winner.lot || this.round()?.title || 'Лот';
	});

	readonly orderView = computed(() => {
		const round = this.round();

		return (round?.order ?? []).map((participant) => ({
			...participant,
			label:
				this.labelMode() === 'viewer'
					? participant.displayName
					: participant.lot || round?.title || 'Лот',
		}));
	});

	readonly revealedCount = computed(() => {
		const round = this.round();

		if (!round || round.state === 'collecting' || this.spinPending()) {
			return 0;
		}

		if (round.state === 'finished') {
			return this.orderView().length;
		}

		const spinAt = round.spinAt ? new Date(round.spinAt).getTime() : this.now();
		const elapsed = Math.max(0, this.now() - spinAt);

		return Math.min(this.orderView().length, Math.max(1, Math.floor(elapsed / 2000) + 1));
	});

	readonly eliminatedView = computed(() =>
		this.isElimination()
			? this.orderView().slice(0, Math.max(0, this.revealedCount() - 1))
			: [],
	);

	readonly recentEliminated = computed(() => {
		const round = this.round();
		const eliminated = round?.lastEliminated;

		if (!eliminated || !round.eliminatedAt) {
			return null;
		}

		const age = this.now() - new Date(round.eliminatedAt).getTime();

		return age < 5000 ? eliminated : null;
	});

	readonly winnerView = computed(() => {
		const winner = this.round()?.winner;

		if (!winner) {
			return null;
		}

		return {
			...winner,
			label:
				this.labelMode() === 'viewer'
					? winner.displayName
					: winner.lot || this.round()?.title || 'Лот',
		};
	});

	readonly lastWin = computed(() => this.last()?.win ?? 0);
	readonly winnerLuck = computed(() => this.round()?.winner?.luckMultiplier ?? 1);
	readonly hasLuck = computed(() => this.participants().some((participant) => participant.luck));
	readonly sectors = computed(() =>
		this.buildSectors(this.participants(), this.round()?.title ?? 'Колесо'),
	);

	private buildSectors(participants: import('@shared/types/automation').WheelParticipant[], title: string) {
		const palette = ['#FF2EA6', '#22E0FF', '#FFE14D', '#7C5CFF', '#2EE6A8', '#FF8A3D'];
		const fallbackSegments = this.displaySegments();
		const fallbackTotal = fallbackSegments.reduce((sum, item) => sum + item.weight, 0);
		const items: { id: string; label: string; color: string; chance: number }[] = [];

		if (participants.length > 0) {
			for (const [index, participant] of participants.entries()) {
				items.push({
					id: participant.userId,
					label:
						this.labelMode() === 'viewer'
							? participant.displayName
							: participant.lot || title,
					color: participant.luck && !participant.boostUsed ? '#FFD166' : palette[index % palette.length],
					chance: participant.chance ?? 100 / participants.length,
				});
			}
		} else {
			for (const segment of fallbackSegments) {
				items.push({
					id: segment.id,
					label: segment.label,
					color: segment.color,
					chance: (segment.weight / fallbackTotal) * 100,
				});
			}
		}

		const total = items.reduce((sum, item) => sum + item.chance, 0);
		let cursor = -90;
		const firstSize = (items[0]?.chance / total) * 360;
		cursor -= firstSize / 2;

		return items.map((item, index) => {
			const size = (item.chance / total) * 360;
			const start = cursor;
			const end = start + size;
			const mid = start + size / 2;
			const radians = (mid * Math.PI) / 180;
			const labelRadius = 128;

			cursor = end;

			return {
				...item,
				index,
				start,
				end,
				mid,
				textColor: luminance(item.color) > 0.45 ? '#0F0817' : '#FFFFFF',
				path: arcPath(200, 200, 190, start, end),
				labelX: 200 + labelRadius * Math.cos(radians),
				labelY: 200 + labelRadius * Math.sin(radians),
				labelRotate: 0,
			};
		});
	}

	readonly wheelGlow = computed(() => {
		const value = this.appearance();

		return `0 0 ${value.glowSize}px ${value.glowColor}, 0 24px 70px rgb(0 0 0 / 55%)`;
	});

	sectorItemsFor() {
		return this.sectors();
	}

	readonly displaySectors = computed(() => this.frozenSectors() ?? this.sectors());

	readonly hoveredSector = computed(() => {
		const index = this.hovered();

		return index === null ? null : this.displaySectors()[index] ?? null;
	});

	readonly resultRotation = computed(() => {
		const round = this.round();

		if (!round) {
			return 0;
		}

		if (round.mode === 'elimination') {
			const target = round.state === 'spinning' ? round.order?.[0] : undefined;
			const sector = target
				? this.sectors().find((item) => item.id === target.userId)
				: undefined;

			if (sector) {
				return -90 - sector.mid;
			}

			if (round.state === 'collecting' && round.lastEliminated) {
				return this.lastEliminationRotation();
			}
		}

		const winnerId = round.winner?.userId;
		const sector = winnerId
			? this.sectors().find((item) => item.id === winnerId)
			: this.sectors().find((item) => item.label === this.last()?.label);

		return sector ? -90 - sector.mid : 0;
	});

	readonly state = toSignal(
		timer(0, 2000).pipe(
			switchMap(() =>
				this.games.wheelState().pipe(catchError(() => of(null as WheelState | null))),
			),
		),
		{ initialValue: null as WheelState | null },
	);

	readonly round = computed(() => this.state()?.round ?? null);
	readonly last = computed(() => this.state()?.last ?? null);
	readonly participantsCount = computed(() => this.round()?.participants?.length ?? 0);
	readonly participants = computed(() => this.round()?.participants ?? []);
	readonly lotMetaMap = signal<Record<string, LotMeta>>({});
	readonly lotLabels = computed(() => ({
		game: this.i18n.t('wheel.lot.game'),
		movie: this.i18n.t('wheel.lot.movie'),
		music: this.i18n.t('wheel.lot.music'),
		other: this.i18n.t('wheel.lot.other'),
		loading: this.i18n.t('wheel.lot.loading'),
		noDescription: this.i18n.t('wheel.lot.noDescription'),
		description: this.i18n.t('wheel.lot.description'),
		completion: this.i18n.t('wheel.lot.completion'),
		dlc: this.i18n.t('wheel.lot.dlc'),
		platforms: this.i18n.t('wheel.lot.platforms'),
		hastily: this.i18n.t('wheel.lot.hastily'),
		normally: this.i18n.t('wheel.lot.normally'),
		completely: this.i18n.t('wheel.lot.completely'),
		viewer: this.i18n.t('wheel.lot.viewer'),
		bet: this.i18n.t('wheel.lot.bet'),
		chance: this.i18n.t('wheel.lot.chance'),
		luck: this.i18n.t('wheel.lot.luck'),
		details: this.i18n.t('wheel.lot.details'),
		releaseDate: this.i18n.t('wheel.lot.releaseDate'),
		developer: this.i18n.t('wheel.lot.developer'),
		publisher: this.i18n.t('wheel.lot.publisher'),
		genres: this.i18n.t('wheel.lot.genres'),
		modes: this.i18n.t('wheel.lot.modes'),
		perspectives: this.i18n.t('wheel.lot.perspectives'),
		themes: this.i18n.t('wheel.lot.themes'),
		runtime: this.i18n.t('wheel.lot.runtime'),
		album: this.i18n.t('wheel.lot.album'),
		artist: this.i18n.t('wheel.lot.artist'),
		website: this.i18n.t('wheel.lot.website'),
		storyline: this.i18n.t('wheel.lot.storyline'),
		rating: this.i18n.t('wheel.lot.rating'),
		editions: this.i18n.t('wheel.lot.editions'),
		mods: this.i18n.t('wheel.lot.mods'),
	}));

	readonly metaLoading = signal<Set<string>>(new Set());
	readonly failedMeta = signal<Set<string>>(new Set());
	private readonly pendingMeta = new Set<string>();
	private readonly metaEffect = effect(() => {
		const round = this.round();
		const lang = this.i18n.language();
		const names = new Set(
			(round?.participants ?? []).map((participant) => participant.lot || round?.title || 'Колесо'),
		);
		const cache = this.lotMetaMap();

		for (const name of names) {
			const key = `${lang}|${name}`;

			if (!name || this.isTestLot(name) || cache[key] || this.pendingMeta.has(key) || this.failedMeta().has(key)) {
				continue;
			}

			this.pendingMeta.add(key);
			this.metaLoading.update((set) => new Set(set).add(name));

			this.lots
				.parse(name, 'auto', lang)
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe({
					next: (meta) => {
						this.lotMetaMap.update((map) => ({ ...map, [key]: meta }));
						this.pendingMeta.delete(key);
						this.metaLoading.update((set) => {
							const next = new Set(set);

							next.delete(name);

							return next;
						});
					},
					error: () => {
						this.pendingMeta.delete(key);
						this.failedMeta.update((set) => new Set(set).add(key));
						this.metaLoading.update((set) => {
							const next = new Set(set);

							next.delete(name);

							return next;
						});
					},
				});
		}
	});

	readonly lotRows = computed(() =>
		this.participants().map((participant) => {
			const name = participant.lot || this.round()?.title || 'Колесо';
			const meta = this.lotMetaMap()[`${this.i18n.language()}|${name}`] ?? null;
			const labels = this.lotLabels();
			const dlc = meta?.dlc ?? [];
			const platforms = meta?.platforms ?? [];
			const rating = meta?.rating ? `★ ${meta.rating.toFixed(0)}` : '';
			const aggregated = meta?.aggregatedRating ? `★ ${meta.aggregatedRating.toFixed(0)}` : '';
			const facts = [
				{ label: labels.releaseDate, value: meta?.releaseDate || '' },
				{ label: labels.developer, value: (meta?.developers ?? []).join(', ') },
				{ label: labels.publisher, value: (meta?.publishers ?? []).join(', ') },
				{ label: labels.genres, value: meta?.genre || '' },
				{ label: labels.modes, value: (meta?.gameModes ?? []).join(', ') },
				{ label: labels.perspectives, value: (meta?.perspectives ?? []).join(', ') },
				{ label: labels.themes, value: (meta?.themes ?? []).join(', ') },
				{ label: labels.platforms, value: platforms.join(', ') },
				{ label: labels.artist, value: meta?.artist || '' },
				{ label: labels.album, value: meta?.album || '' },
				{ label: labels.runtime, value: meta?.runtimeMinutes ? this.formatRuntime(meta.runtimeMinutes) : '' },
				{
					label: labels.runtime,
					value: meta?.durationSeconds ? this.formatDuration(meta.durationSeconds) : '',
				},
				{ label: labels.rating, value: [rating, aggregated].filter(Boolean).join(' / ') },
			].filter((fact) => fact.value);

			return {
				...participant,
				meta,
				metaLoading: this.metaLoading().has(name),
				metaTitle: meta?.title || name,
				metaTest: this.isTestLot(name),
				metaOriginalTitle: meta?.originalTitle || '',
				metaType: meta?.type ?? '',
				metaTypeLabel: meta ? this.lotTypeName(meta.type) : '',
				metaYear: meta?.year ?? 0,
				metaGenre: meta?.genre ?? '',
				metaRating: meta?.rating ?? 0,
				metaSourceLabel: meta ? this.lotSourceName(meta.source) : '',
				metaDescription: meta?.description || '',
				metaStoryline: meta?.storyline || '',
				metaWebsite: meta?.website || '',
				metaFacts: facts,
				metaDlc: dlc,
				metaDlcCount: dlc.length,
				metaEditions: meta?.editions ?? [],
				metaMods: meta?.mods ?? [],
				metaModsUrl: meta?.modsUrl || '',
				metaCompletion: meta?.completion ?? null,
				boostAvailable:
					participant.luck &&
					!participant.boostUsed &&
					!this.boostedLots().has(participant.userId),
			};
		}),
	);

	readonly removingLots = signal<Set<string>>(new Set());
	readonly lastEliminationRotation = signal(0);
	readonly wheelAngle = signal(0);
	readonly frozenSectors = signal<ReturnType<WheelPage['sectorItemsFor']> | null>(null);
	readonly refreshingWheel = signal(false);
	readonly spinActive = computed(() => this.spinning() || this.roundState() === 'spinning');
	readonly spinDuration = signal(4);
	readonly spinFrom = signal(0);
	readonly animating = signal(false);
	readonly hintUserId = signal<string | null>(null);
	readonly hintRow = computed(
		() => this.lotRows().find((row) => row.userId === this.hintUserId()) ?? null,
	);

	readonly winner = computed(() => this.round()?.winner?.displayName ?? '—');
	readonly overlayUrl = `${location.origin}/overlay/wheel`;
	readonly previewLabels = computed(() => {
		const segments = this.displaySegments();
		const step = 360 / segments.length;

		return segments.map((segment, index) => {
			const angle = (index + 0.5) * step;
			const radians = (angle * Math.PI) / 180;

			return {
				id: segment.id,
				label: segment.label,
				color: segment.color,
				left: 50 + 36 * Math.cos(radians),
				top: 50 + 36 * Math.sin(radians),
				rotate: angle,
			};
		});
	});

	readonly previewGradient = computed(() => {
		const segments = this.displaySegments();

		if (!segments.length) {
			return [
				'conic-gradient(',
				'#FF2EA6 0 72deg, #22E0FF 72deg 144deg, #FFE14D 144deg 216deg,',
				'#7C5CFF 216deg 288deg, #2EE6A8 288deg 360deg)',
			].join(' ');
		}

		const step = 360 / segments.length;

		return `conic-gradient(${segments
			.map((segment, index) => `${segment.color || '#FF2EA6'} ${index * step}deg ${(index + 1) * step}deg`)
			.join(', ')})`;
	});

	constructor() {
		effect(() => {
			const round = this.round();
			const id = round?.id ?? '';

			if (round?.state === 'spinning') {
				untracked(() => this.beginSpin(round));
			}

			if (id !== this.lastRoundId) {
				this.lastRoundId = id;
				this.frozenSectors.set(null);
				this.refreshingWheel.set(false);
			}
		});

		effect(() => {
			const key = this.participants()
				.map((participant) => `${participant.userId}:${(participant.chance ?? 0).toFixed(2)}`)
				.join('|');

			if (key && this.lastSectorKey && key !== this.lastSectorKey && !this.spinning()) {
				this.refreshingWheel.set(true);
				this.triggerChanceFlash();

				timer(700)
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe(() => this.refreshingWheel.set(false));
			}

			this.lastSectorKey = key;
		});

		effect(() => {
			const round = this.round();

			if (!round || round.mode !== 'elimination' || round.state !== 'spinning') {
				return;
			}

			const target = round.order?.[0];
			const sector = target ? this.sectors().find((item) => item.id === target.userId) : undefined;

			if (sector) {
				this.lastEliminationRotation.set(-90 - sector.mid);
			}
		});

		effect(() => {
			const base = this.base;
			const ready = this.settingsReady();

			this.mode();
			this.labelMode();
			this.spinDelay();
			this.roundSeconds();
			this.minBet();
			this.maxBet();
			this.segments();
			this.boosts();
			this.soundUrl();
			this.centerUrl();
			this.appearance();

			if (!base || !ready) {
				return;
			}

			if (!this.autoSaveStarted) {
				this.autoSaveStarted = true;

				return;
			}

			if (this.autoSaveTimer) {
				clearTimeout(this.autoSaveTimer);
			}

			this.autoSaveTimer = setTimeout(() => this.persist(false), 700);
		});

		this.settingsForm.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((value) => {
				this.mode.set(value.mode === 'elimination' ? 'elimination' : 'spin');
				this.labelMode.set(value.labelMode === 'viewer' ? 'viewer' : 'lot');
				this.spinDelay.set(value.spinDelay ?? 3);
				this.spinCooldown.set(value.spinCooldown ?? 10);
				this.roundSeconds.set(value.roundSeconds ?? 60);
				this.minBet.set(value.minBet ?? 10);
				this.maxBet.set(value.maxBet ?? 1000);
				this.soundUrl.set(value.soundUrl ?? '');
				this.centerUrl.set(value.centerUrl ?? '');
				this.title.set(value.title ?? '');
				this.bet.set(value.bet ?? 100);
			});
		this.appearanceForm.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((value) => this.appearance.set(value as WheelAppearance));

		timer(0, 500)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.now.set(Date.now()));

		timer(0, 50)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				if (
					!this.spinning() &&
					!this.winnerView() &&
					!this.recentEliminated() &&
					!this.spinPending()
				) {
					this.wheelAngle.update((angle) => angle + 0.35);
				}
			});

		effect(() => {
			const appearance = this.appearance();
			const id = 'nsh-wheel-font-face';
			const existing = document.getElementById(id);

			if (!appearance.fontUrl.trim()) {
				existing?.remove();

				return;
			}

			const style = existing ?? document.createElement('style');

			style.id = id;
			style.textContent = `@font-face{font-family:'NSH Custom Wheel Font';src:url('${appearance.fontUrl.replace(/'/g, '')}');font-display:swap;}`;

			if (!existing) {
				document.head.append(style);
			}
		});

		effect(() => {
			const state = this.roundState();

			if (state === 'finished' || this.spinExpired()) {
				this.spinning.set(false);
			}

			if (state === 'collecting' || state === 'finished') {
				this.stopSound();
				this.clearWheelSnapshot();
			}
		});

		this.games
			.getSettings()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((settings) => {
				this.base = settings;
				this.mode.set(settings.wheelMode ?? 'spin');
				this.labelMode.set(settings.wheelLabelMode === 'viewer' ? 'viewer' : 'lot');
				this.spinDelay.set(settings.wheelSpinDelaySeconds ?? 3);
				this.spinCooldown.set(
					(settings.wheelSpinCooldownSeconds ?? 10) < 5
						? 10
						: (settings.wheelSpinCooldownSeconds ?? 10),
				);
				const appearance = { ...DEFAULT_APPEARANCE, ...(settings.wheelAppearance ?? {}) };

				if (appearance.borderColor.startsWith('rgba')) {
					appearance.borderColor = DEFAULT_APPEARANCE.borderColor;
				}

				if (appearance.labelSize < 12) {
					appearance.labelSize = DEFAULT_APPEARANCE.labelSize;
				}

				this.appearance.set(appearance);
				this.settingsForm.patchValue({
					mode: settings.wheelMode === 'elimination' ? 'elimination' : 'spin',
					labelMode: settings.wheelLabelMode === 'viewer' ? 'viewer' : 'lot',
					spinDelay: settings.wheelSpinDelaySeconds ?? 3,
					spinCooldown: settings.wheelSpinCooldownSeconds ?? 10,
					roundSeconds: settings.wheelRoundSeconds ?? 60,
					minBet: settings.minBet,
					maxBet: settings.maxBet,
					soundUrl: settings.wheelSoundUrl ?? '',
					centerUrl: settings.wheelCenterUrl ?? '',
					title: this.title(),
					bet: this.bet(),
				});
				this.appearanceForm.patchValue(appearance);
				this.roundSeconds.set(settings.wheelRoundSeconds ?? 60);
				this.minBet.set(settings.minBet);
				this.maxBet.set(settings.maxBet);
				this.segments.set(
					settings.wheelSegments?.length ? settings.wheelSegments : DEFAULT_SEGMENTS,
				);
				this.boosts.set(
					settings.wheelBoosts?.length ? settings.wheelBoosts : this.boosts(),
				);
				this.soundUrl.set(settings.wheelSoundUrl ?? '');
				this.centerUrl.set(settings.wheelCenterUrl ?? '');
				this.settingsReady.set(true);

				if (settings.wheelCenterUrl && /tenor\.com|giphy\.com/i.test(settings.wheelCenterUrl)) {
					this.resolveCenter();
				}
			});
	}

	setMode(index: number): void {
		this.settingsForm.controls.mode.setValue(index === 0 ? 'spin' : 'elimination');
	}

	setLabelMode(index: number): void {
		this.settingsForm.controls.labelMode.setValue(index === 0 ? 'lot' : 'viewer');
	}

	updateAppearance(field: keyof WheelAppearance, value: string | number | boolean): void {
		this.appearance.update((appearance) => ({ ...appearance, [field]: value }));
	}

	applyPreset(preset: 'classic' | 'generous' | 'hardcore'): void {
		const weights = {
			classic: [35, 30, 20, 10, 5],
			generous: [10, 25, 30, 25, 10],
			hardcore: [60, 20, 10, 7, 3],
		}[preset];

		this.segments.update((list) =>
			list.map((segment, index) => ({ ...segment, weight: weights[index] ?? segment.weight })),
		);
	}

	centerUrlChanged(value: string): void {
		this.centerUrl.set(value);

		const lower = value.toLowerCase();

		if (lower.includes('pin.it') || lower.includes('pinterest.')) {
			this.centerError.set(
				'Это страница Pinterest, а не картинка. Скопируйте прямой адрес изображения (i.pinimg.com) или загрузите файл.',
			);

			return;
		}

		this.centerError.set('');
	}

	setSoundUrl(value: string): void {
		let url = value.trim();

		if (/^https?:\/\/https?:\/\//i.test(url)) {
			url = url.replace(/^https?:\/\//i, '');
		}

		this.soundUrl.set(url);
		this.soundError.set('');
	}

	uploadSound(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) {
			return;
		}

		this.soundUploading.set(true);
		this.soundError.set('');

		this.media
			.upload(file)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (media) => {
					this.soundUrl.set(media.url);
					this.settingsForm.controls.soundUrl.setValue(media.url);
					this.soundUploading.set(false);
					input.value = '';
				},
				error: (response) => {
					this.soundError.set(response.error?.error ?? 'Не удалось загрузить аудио');
					this.soundUploading.set(false);
					input.value = '';
				},
			});
	}

	resolveSound(): void {
		const url = this.soundUrl().trim();

		if (!url || url.startsWith('/') || url.startsWith('data:')) {
			return;
		}

		if (/youtube\.com|youtu\.be|soundcloud\.com/i.test(url)) {
			this.soundError.set('');
			this.soundResolving.set(false);

			return;
		}

		this.soundResolving.set(true);
		this.soundError.set('');

		this.media
			.resolveAudio(url)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (media) => {
					this.soundUrl.set(media.url);
					this.settingsForm.controls.soundUrl.setValue(media.url);
					this.soundResolving.set(false);
				},
				error: (response) => {
					this.soundError.set(response.error?.error ?? 'Не удалось найти аудио по ссылке');
					this.soundResolving.set(false);
				},
			});
	}

	resolveCenter(): void {
		const url = this.centerUrl().trim();

		if (!url || url.startsWith('/') || url.startsWith('data:')) {
			return;
		}

		this.centerResolving.set(true);
		this.centerError.set('');

		this.media
			.resolve(url)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (media) => {
					this.centerUrl.set(media.url);
					this.settingsForm.controls.centerUrl.setValue(media.url);
					this.centerResolving.set(false);
				},
				error: (response) => {
					this.centerError.set(response.error?.error ?? 'Не удалось получить гифку по ссылке');
					this.centerResolving.set(false);
				},
			});
	}

	centerFile(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) {
			return;
		}

		if (file.size > 1_500_000) {
			this.centerError.set('Файл больше 1.5 МБ — выберите картинку поменьше.');

			return;
		}

		const reader = new FileReader();

		reader.onload = () => {
			this.centerUrl.set(String(reader.result ?? ''));
			this.centerError.set('');
		};

		reader.readAsDataURL(file);
	}

	addBoost(): void {
		this.boosts.update((list) => [...list, { value: 1, weight: 10 }]);
	}

	removeBoost(index: number): void {
		this.boosts.update((list) => list.filter((_, itemIndex) => itemIndex !== index));
	}

	updateBoost(index: number, field: keyof WheelBoost, value: number): void {
		this.boosts.update((list) =>
			list.map((boost, itemIndex) =>
				itemIndex === index ? { ...boost, [field]: value } : boost,
			),
		);
	}

	addSegment(): void {
		this.segments.update((list) => [
			...list,
			{
				id: crypto.randomUUID(),
				label: 'Новый сектор',
				multiplier: 1,
				weight: 10,
				color: '#FF2EA6',
			},
		]);
	}

	removeSegment(index: number): void {
		this.segments.update((list) => list.filter((_, itemIndex) => itemIndex !== index));
	}

	private readonly segmentColorControls = new Map<number, FormControl<string>>();

	segmentColor(index: number): FormControl<string> {
		let control = this.segmentColorControls.get(index);

		if (!control) {
			control = new FormControl(this.segments()[index]?.color ?? '#FF2EA6', { nonNullable: true });
			control.valueChanges
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe((value) => this.updateSegment(index, 'color', value));
			this.segmentColorControls.set(index, control);
		}

		return control;
	}

	updateSegment(index: number, field: keyof WheelSegment, value: string | number): void {
		this.segments.update((list) =>
			list.map((segment, itemIndex) =>
				itemIndex === index ? { ...segment, [field]: value } : segment,
			),
		);
	}

	save(): void {
		if (this.autoSaveTimer) {
			clearTimeout(this.autoSaveTimer);
			this.autoSaveTimer = null;
		}

		this.persist(true);
	}

	private persist(showSaved: boolean): void {
		if (!this.base) {
			return;
		}

		this.games
			.saveSettings({
				...this.base,
				wheelMode: this.mode(),
				wheelRoundSeconds: this.roundSeconds(),
				wheelLabelMode: this.labelMode(),
				wheelSpinDelaySeconds: this.spinDelay(),
				wheelSpinCooldownSeconds: this.spinCooldown(),
				wheelAppearance: this.appearance(),
				minBet: this.minBet(),
				maxBet: this.maxBet(),
				wheelSegments: this.segments(),
				wheelBoosts: this.boosts(),
				wheelSoundUrl: this.soundUrl(),
				wheelCenterUrl: this.centerUrl(),
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((settings) => {
				this.base = settings;

				if (showSaved) {
					this.saved.set(true);

					timer(1500)
						.pipe(takeUntilDestroyed(this.destroyRef))
						.subscribe(() => this.saved.set(false));
				}
			});
	}

	start(): void {
		this.clearWheelSnapshot();
		this.games
			.startWheel(this.title().trim() || 'Колесо', this.bet(), this.roundSeconds(), this.mode())
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe();
	}

	spin(): void {
		if (this.spinCooldownRemaining() > 0) {
			return;
		}

		if (this.roundState() !== 'collecting' || !this.participantsCount()) {
			this.testSpin();

			return;
		}

		this.games
			.spinWheel()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((state) => {
				if (state.round) {
					this.beginSpin(state.round);
				}
			});
	}

	private beginSpin(round: WheelRound): void {
		const key = `${round.id}@${round.spinAt ?? round.startedAt}`;

		if (key === this.lastSpinKey || !round.spinAt || !round.spinEndsAt) {
			return;
		}

		this.lastSpinKey = key;
		const order = round.order ?? [];
		const target = round.mode === 'elimination' ? order[0] : order[order.length - 1];
		const spinAt = new Date(round.spinAt).getTime();
		const endsAt = new Date(round.spinEndsAt).getTime();
		const delay = Math.max(0, spinAt - Date.now());
		const duration = Math.max(0.6, (endsAt - Math.max(Date.now(), spinAt)) / 1000);

		this.spinning.set(true);
		this.spinDuration.set(duration);
		this.frozenSectors.set(
			this.buildSectors(round.participants, round.title),
		);

		timer(delay)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.playSound();

				const startAngle = this.wheelAngle();
				const base = this.sectorRotation(target?.userId);
				const delta = ((base - startAngle) % 360 + 360) % 360;
				const targetAngle = startAngle + 360 * 5 + delta;

				this.spinFrom.set(startAngle);
				this.wheelAngle.set(targetAngle);
				this.animating.set(true);

				timer(duration * 1000 + 120)
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe(() => {
						this.animating.set(false);
						this.spinning.set(false);
						this.refreshingWheel.set(true);

						timer(450)
							.pipe(takeUntilDestroyed(this.destroyRef))
							.subscribe(() => {
								this.frozenSectors.set(null);
								this.refreshingWheel.set(false);
							});
					});
			});
	}

	private sectorRotation(userId?: string): number {
		if (!userId) {
			return 0;
		}

		const sector = this.displaySectors().find((item) => item.id === userId);

		return sector ? -90 - sector.mid : 0;
	}

	testSpin(): void {
		this.clearWheelSnapshot();
		this.playSound();
		this.persist(false);
		this.spinning.set(true);

		timer(400)
			.pipe(
				switchMap(() => this.games.startWheel('Тестовое колесо', 100, 60, this.mode(), true)),
				switchMap(() => this.games.addWheelLot('Тест 1', 100, false)),
				switchMap(() => this.games.addWheelLot('Тест 2', 250, false)),
				switchMap(() => this.games.addWheelLot('Тест 3', 500, true)),
				switchMap(() => timer(900)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => {
				this.games
					.spinWheel()
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe();
			});
	}

	readonly boostRows = computed(() => {
		const boosts = this.boosts();
		const total = boosts.reduce((sum, boost) => sum + boost.weight, 0) || 1;

		return boosts.map((boost) => ({ ...boost, chance: (boost.weight / total) * 100 }));
	});

	readonly activeBoosts = computed(() => this.state()?.settings?.wheelBoosts ?? this.boosts());
	readonly boostValues = computed(
		() => this.activeBoosts().map((boost) => boost.value),
	);

	readonly hasAvailableBoost = computed(() => this.lotRows().some((row) => row.boostAvailable));
	readonly lotPreview = computed(() => {
		const name = this.lotName().trim();

		if (!name) {
			return '';
		}

		const lower = name.toLowerCase();
		const type = /фильм|movie|кино/.test(lower)
			? 'Фильм'
			: /игр|game/.test(lower)
				? 'Игра'
				: /музык|music|трек|song|audio/.test(lower)
					? 'Музыка'
					: 'Лот';

		return `${type} · ${name} · удача: ${this.lotLuck() ? 'да' : 'нет'}`;
	});

	openFirstBoost(): void {
		const participant = this.lotRows().find((row) => row.boostAvailable);

		if (participant) {
			this.openBoost(participant);
		}
	}

	openBoost(participant: import('@shared/types/automation').WheelParticipant): void {
		if (!participant.luck || participant.boostUsed || this.boostedLots().has(participant.userId)) {
			return;
		}

		this.boostParticipant.set(participant);
	}

	closeBoost(): void {
		this.boostParticipant.set(null);
	}

	applyBoost(userId: string): void {
		this.boostedLots.update((set) => new Set(set).add(userId));
		this.flashUserId.set(userId);
		this.triggerChanceFlash();
		setTimeout(() => {
			if (this.flashUserId() === userId) {
				this.flashUserId.set(null);
			}
		}, 900);
		this.boostParticipant.set(null);
	}

	private formatRuntime(minutes: number): string {
		if (!minutes) {
			return '';
		}

		const hours = Math.floor(minutes / 60);
		const rest = minutes % 60;
		const language = this.i18n.language();

		if (!hours) {
			return language === 'en' ? `${rest} min` : `${rest} мин`;
		}

		return language === 'en' ? `${hours} h ${rest} min` : `${hours} ч ${rest} мин`;
	}

	private formatDuration(seconds: number): string {
		if (!seconds) {
			return '';
		}

		const minutes = Math.floor(seconds / 60);
		const rest = seconds % 60;

		return `${minutes}:${String(rest).padStart(2, '0')}`;
	}

	private isTestLot(name: string): boolean {
		const value = name.toLowerCase().trim();

		if (!value) {
			return true;
		}

		if (/(^|\s)(тест|test|demo|sample|fake|проверка|пример)(\s|$)/.test(value)) {
			return true;
		}

		if (/(^|\s)(удача|luck|ставка|bet)(\s|$)/.test(value)) {
			return true;
		}

		return /^(лот|lot)\s*[a-zа-я0-9]?$/.test(value);
	}

	private lotSourceName(source: string): string {
		switch (source) {
			case 'wikipedia':
				return 'Wikipedia';
			case 'steam':
				return 'Steam';
			case 'deezer':
				return 'Deezer';
			case 'itunes':
				return 'iTunes';
			default:
				return '';
		}
	}

	private lotTypeName(type: string): string {
		switch (type) {
			case 'game':
				return this.i18n.t('wheel.lot.game');
			case 'movie':
				return this.i18n.t('wheel.lot.movie');
			case 'music':
				return this.i18n.t('wheel.lot.music');
			default:
				return this.i18n.t('wheel.lot.other');
		}
	}

	private triggerChanceFlash(): void {
		this.chanceFlash.set(true);
		setTimeout(() => this.chanceFlash.set(false), 650);
	}

	refundWheel(): void {
		this.games
			.refundWheel()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({ error: () => undefined });
	}

	private clearWheelSnapshot(): void {
		this.spinning.set(false);
		this.frozenSectors.set(null);
		this.refreshingWheel.set(false);
		this.wheelAngle.set(0);
	}

	resetWheel(): void {
		this.games
			.resetWheel()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.boostedLots.set(new Set());
				this.boostParticipant.set(null);
				this.flashUserId.set(null);
				this.chanceFlash.set(false);
				this.failedMeta.set(new Set());
				this.stopSound();
			});
	}

	setLotType(index: number): void {
		this.lotType.set(this.lotTypes[index] ?? 'auto');
		this.lotMeta.set(null);
		this.lotMetaError.set('');
	}

	checkLot(): void {
		const name = this.lotName().trim();

		if (!name) {
			return;
		}

		if (this.isTestLot(name)) {
			this.lotMeta.set(null);
			this.lotMetaLoading.set(false);
			this.lotMetaError.set('Тестовый лот — поиск информации отключён');

			return;
		}

		this.lotMetaError.set('');
		this.lotMetaLoading.set(true);
		this.resolveLot(name).subscribe((meta) => {
			this.lotMeta.set(meta);
			this.lotMetaLoading.set(false);

			if (!meta) {
				this.lotMetaError.set('Не удалось получить метаданные');
			}
		});
	}

	private resolveLot(name: string) {
		const lang = this.i18n.language();
		const kind = this.lotType();

		if (kind !== 'auto') {
			return this.lots
				.parse(name, kind, lang)
				.pipe(catchError(() => of(null)));
		}

		return this.lots.parse(name, 'game', lang).pipe(
			catchError(() =>
				this.lots.parse(name, 'auto', lang).pipe(catchError(() => of(null))),
			),
		);
	}

	addLot(): void {
		const name = this.lotName().trim() || 'Лот';

		if (this.isTestLot(name)) {
			this.addLotWithName(name);

			return;
		}

		this.resolveLot(name)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((meta) =>
				this.addLotWithName(
					meta?.title?.trim() || name,
					meta?.url?.trim() || meta?.title?.trim() || name,
				),
			);
	}

	private addLotWithName(name: string, key = ''): void {
		this.games
			.addWheelLot(name, this.lotBet(), this.lotLuck(), this.lotViewer(), key)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.lotName.set('');
				this.lotViewer.set('');
				this.lotLuck.set(false);
			});
	}

	removeLot(userId: string): void {
		this.removingLots.update((set) => new Set(set).add(userId));
		timer(240)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.games
					.removeWheelLot(userId)
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe(() => {
						this.removingLots.update((set) => {
							const next = new Set(set);
							next.delete(userId);

							return next;
						});
						this.triggerChanceFlash();
					});
			});
	}

	playSound(): void {
		const url = this.soundUrl().trim();

		if (!url) {
			return;
		}

		this.stopSound();

		const audio = new Audio(this.media.playUrl(url));
		audio.volume = 0.7;
		this.wheelAudio = audio;

		void audio.play().catch(() => {
			this.soundError.set('Браузер не смог воспроизвести этот файл. Нужна прямая ссылка на аудио.');
		});
	}

	private stopSound(): void {
		if (!this.wheelAudio) {
			return;
		}

		this.wheelAudio.pause();
		this.wheelAudio.currentTime = 0;
		this.wheelAudio = null;
	}
}
