import type {
	WheelAppearance,
	WheelParticipant,
	WheelSegment,
	WheelState,
} from '@shared/types/automation';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { GamesService } from '@shared/services/engagement.services';
import { MediaService } from '@shared/services/media.service';
import { catchError, of, switchMap, timer } from 'rxjs';

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
	labelSize: 11,
	labelStrokeColor: '#0F0817',
	labelStrokeWidth: 2,
	showLabels: true,
	showChances: true,
	fontFamily: '',
	fontUrl: '',
};

@Component({
	selector: 'app-wheel-overlay',
	styleUrl: './wheel-overlay.scss',
	templateUrl: './wheel-overlay.html',
})

export class WheelOverlay {
	private readonly games = inject(GamesService);
	private readonly media = inject(MediaService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly now = signal(Date.now());
	readonly winnerParticles = Array.from({ length: 24 }, (_, index) => ({
		left: (index * 41) % 100,
		delay: (index % 8) * 0.09,
		duration: 1.3 + (index % 5) * 0.2,
		size: 3 + (index % 3) * 2,
		color: ['#FFD166', '#FF5AA9', '#7C5CFF', '#22E0FF', '#2EE6A8'][index % 5],
	}));

	private lastSoundKey = '';
	private wheelAudio: HTMLAudioElement | null = null;

	readonly state = toSignal(
		timer(0, 1000).pipe(
			switchMap(() =>
				this.games.wheelState().pipe(catchError(() => of(null as WheelState | null))),
			),
		),
		{ initialValue: null as WheelState | null },
	);

	readonly round = computed(() => this.state()?.round ?? null);
	readonly segments = computed<WheelSegment[]>(() => this.state()?.settings?.wheelSegments ?? []);

	readonly last = computed(() => this.state()?.last ?? null);
	readonly roundState = computed(() => this.round()?.state ?? 'idle');
	readonly title = computed(() => this.round()?.title ?? this.last()?.title ?? 'Колесо');
	readonly pot = computed(() => this.round()?.pot ?? 0);
	readonly participants = computed(() => this.round()?.participants ?? []);
	readonly order = computed(() => this.round()?.order ?? []);
	readonly countdown = computed(() => {
		const round = this.round();

		if (!round || round.state !== 'collecting') {
			return '';
		}

		const remaining = Math.max(0, new Date(round.deadline).getTime() - this.now());

		return `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;
	});

	readonly revealed = computed(() => {
		const round = this.round();

		if (!round || round.state === 'collecting' || this.spinPending()) {
			return 0;
		}

		if (round.state === 'finished') {
			return this.order().length;
		}

		const spinAt = round.spinAt ? new Date(round.spinAt).getTime() : this.now();
		const elapsed = Math.max(0, this.now() - spinAt);

		return Math.min(this.order().length, Math.max(1, Math.floor(elapsed / 2000) + 1));
	});

	readonly eliminated = computed<WheelParticipant[]>(() => {
		const order = this.order();
		const revealed = this.revealed();

		return order.slice(0, Math.max(0, revealed - 1));
	});

	readonly winner = computed<WheelParticipant | null>(() => {
		const round = this.round();

		if (!round) {
			return null;
		}

		if (round.winner) {
			return round.winner;
		}

		if (round.state === 'finished' && this.order().length) {
			return this.order()[this.order().length - 1];
		}

		return null;
	});

	readonly labelMode = computed(() => this.state()?.settings?.wheelLabelMode === 'viewer' ? 'viewer' : 'lot');
	readonly participantsView = computed(() =>
		this.participants().map((participant) => ({
			...participant,
			label: this.participantLabel(participant),
		})),
	);

	readonly orderView = computed(() =>
		this.order().map((participant) => ({
			...participant,
			label: this.participantLabel(participant),
		})),
	);

	readonly spinPending = computed(() => {
		const round = this.round();

		if (!round || round.state !== 'spinning' || !round.spinAt) {
			return false;
		}

		return this.now() < new Date(round.spinAt).getTime();
	});

	readonly isSpinning = computed(() => {
		const round = this.round();

		if (!round || round.state !== 'spinning' || this.spinPending()) {
			return false;
		}

		if (!round.spinEndsAt) {
			return true;
		}

		return this.now() < new Date(round.spinEndsAt).getTime();
	});

	readonly recentEliminated = computed(() => {
		const round = this.round();
		const eliminated = round?.lastEliminated;

		if (!eliminated || !round.eliminatedAt) {
			return null;
		}

		return this.now() - new Date(round.eliminatedAt).getTime() < 5000 ? eliminated : null;
	});

	readonly eliminatedView = computed(() => {
		const order = this.orderView();
		const revealed = this.revealed();

		return order.slice(0, Math.max(0, revealed - 1));
	});

	readonly winnerView = computed(() => {
		const winner = this.winner();

		return winner
			? { ...winner, label: this.participantLabel(winner) }
			: null;
	});

	private participantLabel(participant: WheelParticipant): string {
		if (this.labelMode() === 'viewer') {
			return participant.displayName;
		}

		return participant.lot || this.title();
	}

	readonly isElimination = computed(() => this.round()?.mode === 'elimination');
	readonly sectors = computed(() => {
		const participants = this.participants();
		const fallback = this.segments();
		const palette = ['#FF2EA6', '#22E0FF', '#FFE14D', '#7C5CFF', '#2EE6A8', '#FF8A3D'];
		const participantItems = participants.map((participant, index) => ({
			id: participant.userId,
			label: this.participantLabel(participant),
			color:
				participant.luck && !participant.boostUsed
					? '#FFD166'
					: palette[index % palette.length],
			chance: participant.chance ?? 100 / participants.length,
		}));
		const fallbackItems = fallback.map((segment) => ({
			id: segment.id,
			label: segment.label,
			color: segment.color || '#FF2EA6',
			chance: segment.weight || 1,
		}));
		const items = participants.length ? participantItems : fallbackItems;
		const total = items.reduce((sum, item) => sum + item.chance, 0) || 1;
		let cursor = 0;

		return items.map((item) => {
			const size = (item.chance / total) * 360;
			const start = cursor;
			const end = start + size;
			const mid = start + size / 2;
			cursor = end;

			return { ...item, start, end, mid };
		});
	});

	readonly wheelGradient = computed(() => {
		const sectors = this.sectors();

		if (!sectors.length) {
			return [
				'conic-gradient(',
				'#ff2ea6 0 72deg, #22e0ff 72deg 144deg, #ffe14d 144deg 216deg,',
				'#7c5cff 216deg 288deg, #2ee6a8 288deg 360deg)',
			].join(' ');
		}

		return `conic-gradient(${sectors
			.map((sector) => `${sector.color} ${sector.start}deg ${sector.end}deg`)
			.join(', ')})`;
	});

	readonly wheelAngle = signal(0);
	private lastRotationKey = '';

	readonly targetRotation = computed(() => {
		const round = this.round();

		if (round) {
			if (round.mode === 'elimination') {
				const target =
					round.state === 'spinning'
						? round.order?.[0]
						: (round.lastEliminated ?? round.winner);
				const sector = target
					? this.sectors().find((item) => item.id === target.userId)
					: undefined;

				return sector ? -sector.mid : 0;
			}

			const winner =
				round.winner ??
				(round.state === 'spinning' ? round.order?.[round.order.length - 1] : undefined);

			if (winner) {
				const sector = this.sectors().find((item) => item.id === winner.userId);

				if (sector) {
					return -sector.mid;
				}
			}
		}

		const last = this.last();
		const sector = last
			? this.sectors().find((item) => item.label === last.label)
			: undefined;

		return sector ? -sector.mid : 0;
	});

	readonly lastLabel = computed(() => this.last()?.label ?? 'Крутите колесо');
	readonly lastMultiplier = computed(() => this.last()?.multiplier ?? 0);
	readonly lastWin = computed(() => this.last()?.win ?? 0);
	readonly luckMultiplier = computed(() => this.last()?.luckMultiplier ?? 0);
	readonly lastUser = computed(() => this.last()?.user ?? '');
	readonly centerUrl = computed(() => this.state()?.settings?.wheelCenterUrl ?? '');
	readonly fontFamilyCss = computed(() => {
		const appearance = this.appearance();

		if (appearance.fontFamily.trim()) {
			return appearance.fontFamily.trim();
		}

		return appearance.fontUrl.trim() ? 'NSH Custom Wheel Font' : null;
	});

	readonly appearance = computed<WheelAppearance>(() => ({
		...DEFAULT_APPEARANCE,
		...(this.state()?.settings?.wheelAppearance ?? {}),
	}));

	readonly wheelLabels = computed(() =>
		this.sectors().map((sector) => {
			const angle = (sector.mid - 90) * (Math.PI / 180);

			return {
				id: sector.id,
				label: sector.label,
				left: 50 + 34 * Math.cos(angle),
				top: 50 + 34 * Math.sin(angle),
			};
		}),
	);

	constructor() {
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
			style.textContent =
				'@font-face{font-family:\'NSH Custom Wheel Font\';' +
				`src:url('${appearance.fontUrl.replace(/'/g, '')}');font-display:swap;}`;

			if (!existing) {
				document.head.append(style);
			}
		});

		effect(() => {
			const round = this.round();
			const target = this.targetRotation();
			const spinning = this.isSpinning();
			const finished = round?.state === 'finished';

			if (!round || (!spinning && !finished)) {
				return;
			}

			const key = [
				round.id,
				round.state,
				round.winner?.userId ?? '',
				round.order?.[0]?.userId ?? '',
				round.lastEliminated?.userId ?? '',
			].join(':');

			if (key === this.lastRotationKey) {
				return;
			}

			this.lastRotationKey = key;
			const current = this.wheelAngle();
			const delta = ((target - current) % 360 + 360) % 360;
			const turns = spinning ? 4 : 0;

			this.wheelAngle.set(current + turns * 360 + delta);
		});

		effect(() => {
			const state = this.state();
			const url = state?.settings?.wheelSoundUrl ?? '';

			if (!url) {
				this.stopSound();

				return;
			}

			if (this.isSpinning()) {
				const key = `${this.round()?.id ?? ''}:spin`;

				if (key !== this.lastSoundKey) {
					this.lastSoundKey = key;
					this.playSound(url);
				}

				return;
			}

			this.lastSoundKey = '';
			this.stopSound();
		});

		timer(0, 500)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.now.set(Date.now()));
	}

	private playSound(url: string): void {
		this.stopSound();

		const audio = new Audio(this.media.playUrl(url));
		audio.volume = 0.7;
		this.wheelAudio = audio;
		void audio.play().catch(() => undefined);
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
