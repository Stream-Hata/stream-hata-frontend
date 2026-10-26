import type { Game } from '@shared/types/game';
import type {
	RouletteAppearance,
	RouletteAudio,
	RouletteMode,
	RouletteReveal,
	RouletteRound,
} from '@shared/types/roulette';
import { Component, computed, DestroyRef, effect, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { imageUrl } from '@shared/helpers/proxy-image';
import { TuiButton } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { timer } from 'rxjs';

const CELL_HEIGHT = 92;
const SPIN_MS = 6500;

@Component({
	imports: [RouterLink, TuiBadge, TuiButton],
	selector: 'app-roulette-stage',
	styleUrl: './roulette-stage.scss',
	templateUrl: './roulette-stage.html',
})
export class RouletteStage {
	protected readonly imageUrl = imageUrl;
	private readonly destroyRef = inject(DestroyRef);
	private music: HTMLAudioElement | null = null;
	private revealAudio: HTMLAudioElement | null = null;
	private lastRound = '';
	readonly track = viewChild<ElementRef<HTMLElement>>('track');
	readonly resultCard = viewChild<ElementRef<HTMLElement>>('resultCard');
	readonly rollTarget = signal(0);
	readonly rollFrom = signal(0);
	readonly rolling = signal(false);

	readonly round = input<RouletteRound | null>(null);
	readonly filler = input<Game[]>([]);
	readonly spinning = input(false);
	readonly mode = input<RouletteMode>('classic');
	readonly appearance = input<RouletteAppearance | null>(null);
	readonly reveal = input<RouletteReveal | null>(null);
	readonly audio = input<RouletteAudio | null>(null);
	readonly audioEnabled = input(false);
	readonly interactive = input(true);
	readonly tape = signal<Game[]>([]);
	readonly offset = signal(0);
	readonly resetting = signal(false);
	readonly trackStyle = computed(() => ({ transform: `translateY(-${this.offset()}px)` }));
	readonly rollTargetStyle = computed(() => `-${this.rollTarget()}px`);
	readonly rollFromStyle = computed(() => `-${this.rollFrom()}px`);
	private lastTapeRound = '';

	readonly resultOpen = signal(false);
	readonly title = computed(() => {
		const round = this.round();

		if (!round) {
			return '';
		}

		const template = this.reveal()?.titleTemplate ?? '{{game}} · {{platform}}';

		return template
			.replace('{{game}}', round.game.title)
			.replace('{{platform}}', round.platform.name);
	});

	readonly meme = computed(() => this.appearance()?.memeUrl ?? '');
	readonly cat = computed(() => this.reveal()?.catImage ?? '');

	constructor() {
		timer(0, 50)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				if (this.rolling() || this.resultOpen()) {
					return;
				}

				const max = Math.max(0, this.tape().length * CELL_HEIGHT - 276);
				this.offset.update((value) => (value >= max ? 0 : value + 0.7));
			});

		effect(() => {
			const round = this.round();
			const filler = this.filler();

			if (!round) {
				const list = filler.slice(0, 18);
				this.tape.set(list);
				this.resetting.set(true);
				this.offset.set(0);

				return;
			}

			if (round.id === this.lastTapeRound) {
				return;
			}

			this.lastTapeRound = round.id;
			const pool = filler.length ? filler : [round.game];
			const current = this.offset();
			const currentIndex = Math.max(0, Math.ceil(current / CELL_HEIGHT));
			const winnerIndex = currentIndex + 22;
			const list: Game[] = [];

			for (let index = 0; index < winnerIndex + 8; index++) {
				list.push(pool[index % pool.length]);
			}

			list[winnerIndex] = round.game;
			const target = winnerIndex * CELL_HEIGHT;

			this.offset.set(current);
			this.tape.set(list);
			this.resultOpen.set(false);
			this.rollFrom.set(current);
			this.rollTarget.set(target);
			this.rolling.set(true);

			requestAnimationFrame(() => {
				const element = this.track()?.nativeElement;

				if (!element) {
					return;
				}

				const distance = target - current;
				element.animate(
					[
						{ transform: `translateY(-${current}px)`, offset: 0, easing: 'linear' },
						{
							transform: `translateY(-${current + distance * 0.85}px)`,
							offset: 0.65,
							easing: 'cubic-bezier(0.12, 0.75, 0.2, 1)',
						},
						{ transform: `translateY(-${target}px)`, offset: 1 },
					],
					{
						duration: SPIN_MS,
						fill: 'forwards',
					},
				);
			});

			timer(SPIN_MS)
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe(() => {
					this.offset.set(target);
					this.rolling.set(false);
					this.resetting.set(false);
				});

			timer(SPIN_MS + 400)
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe(() => this.resultOpen.set(true));
		});

		effect(() => {
			if (this.spinning()) {
				this.resultOpen.set(false);
			}
		});

		effect(() => {
			if (!this.resultOpen()) {
				return;
			}

			setTimeout(() => {
				this.resultCard()?.nativeElement.animate(
					[
						{ opacity: 0, transform: 'translateY(14px) scale(.92)' },
						{ opacity: 1, transform: 'translateY(0) scale(1)' },
					],
					{ duration: 360, easing: 'cubic-bezier(.35, 1.3, .25, 1)' },
				);
			});
		});

		effect(() => {
			const spinning = this.spinning();
			const round = this.round();
			const audio = this.audioEnabled();

			if (!audio) {
				return;
			}

			if (spinning) {
				this.lastRound = '';
				this.startMusic();
				this.resultOpen.set(false);
			} else if (round && round.id !== this.lastRound) {
				this.lastRound = round.id;
				this.stopMusic();
				this.playReveal();
			}
		});

		this.destroyRef.onDestroy(() => {
			this.stopMusic();
			this.revealAudio?.pause();
		});
	}

	closeResult(): void {
		this.resultOpen.set(false);
	}

	emulatorNames(): string {
		return this.round()?.game.emulators.map((emulator) => emulator.name).join(', ') ?? '';
	}

	initials(title: string): string {
		return title
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0] ?? '')
			.join('')
			.toUpperCase();
	}

	private startMusic(): void {
		const musicUrl = this.musicUrl();

		if (!musicUrl) {
			return;
		}

		this.stopMusic();
		this.music = new Audio(musicUrl);
		this.music.volume = this.volume();
		this.music.loop = true;
		this.music.play().catch(() => undefined);
	}

	private playReveal(): void {
		const url = this.revealSoundUrl();

		if (!url) {
			return;
		}

		this.revealAudio?.pause();
		this.revealAudio = new Audio(url);
		this.revealAudio.volume = this.volume();
		this.revealAudio.play().catch(() => undefined);
	}

	private stopMusic(): void {
		this.music?.pause();
		this.music = null;
	}

	private musicUrl(): string {
		return this.audioConfig()?.musicUrl ?? '';
	}

	private revealSoundUrl(): string {
		return this.audioConfig()?.revealUrl ?? '';
	}

	private volume(): number {
		return Math.min(1, Math.max(0, (this.audioConfig()?.volume ?? 70) / 100));
	}

	private audioConfig(): RouletteAudio | null {
		return this.audio();
	}
}
