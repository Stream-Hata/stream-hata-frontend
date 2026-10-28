import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, computed, effect, ElementRef, inject, input, OnDestroy, signal, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { WidgetConfigService, type WidgetConfig } from '@shared/services/widgets.service';
import { catchError, of, switchMap, timer } from 'rxjs';
import { DiceScene } from '../dice-overlay/dice-scene';

type GameMode = 'coin' | 'random';

interface GameState {
	kind: string;
	label: string;
	result: string;
	side: string;
	viewer: string;
	rolledAt: string;
}

const EMPTY: GameState = { kind: '', label: '', result: '', side: '', viewer: '', rolledAt: '' };

@Component({
	selector: 'app-game-overlay',
	styleUrl: './game-overlay.scss',
	templateUrl: './game-overlay.html',
})
export class GameOverlay implements AfterViewInit, OnDestroy {
	@ViewChild('coinHost') private coinHost?: ElementRef<HTMLElement>;
	readonly mode = input<GameMode>('coin');
	private readonly preview = new URLSearchParams(location.search).get('preview');
	private readonly http = inject(HttpClient);
	private readonly configService = inject(WidgetConfigService);
	private scene?: DiceScene;
	private lastRolledAt = '';
	private hideTimer: ReturnType<typeof setTimeout> | null = null;
	readonly ready = signal(false);
	readonly rolling = signal(false);
	readonly visible = signal(false);

	readonly state = toSignal(
		timer(0, 650).pipe(
			switchMap(() =>
				this.http
					.get<GameState>('rgg-sync/game', { params: { t: Date.now() } })
					.pipe(catchError(() => of(EMPTY))),
			),
		),
		{ initialValue: EMPTY },
	);

	readonly active = computed(() => this.state().kind === this.mode());
	readonly config = toSignal(
		this.configService.watch('coinflip').pipe(catchError(() => of({ config: {} as WidgetConfig }))),
		{ initialValue: { config: {} as WidgetConfig } },
	);
	readonly heads = computed(() => this.config().config.coinHeads?.trim() || 'Орёл');
	readonly tails = computed(() => this.config().config.coinTails?.trim() || 'Решка');
	readonly result = computed(() => this.active() ? this.state().result : '');
	readonly label = computed(() => this.active() ? this.state().label : '');
	readonly viewer = computed(() => this.active() ? this.state().viewer : '');
	readonly coinSide = computed(() => {
		const state = this.state();

		if (state.side === 'heads' || state.side === 'tails') {
			return state.side;
		}

		return this.result().toLowerCase() === this.tails().toLowerCase() ? 'tails' : 'heads';
	});

	constructor() {
		effect(() => {
			const rolledAt = this.state().rolledAt;
			const active = this.active();

			if (!this.ready()) {
				return;
			}

			if (!active || !rolledAt || rolledAt.startsWith('0001-')) {
				this.visible.set(false);

				return;
			}

			this.scene?.setSides(2, [this.heads(), this.tails(), '']);

			if (rolledAt !== this.lastRolledAt) {
				this.lastRolledAt = rolledAt;
				this.visible.set(true);
				this.rolling.set(true);
				this.scene?.roll(this.coinSide() === 'tails' ? 2 : 1);
				setTimeout(() => this.rolling.set(false), 1000);

				if (this.hideTimer) {
					clearTimeout(this.hideTimer);
				}
				this.hideTimer = setTimeout(() => this.visible.set(false), 8000);
			}
		});
	}

	ngAfterViewInit(): void {
		if (this.coinHost) {
			const accent = getComputedStyle(this.coinHost.nativeElement).getPropertyValue('--accent-primary').trim() || '#ff2ea6';
			try {
				this.scene = new DiceScene(this.coinHost.nativeElement, accent);
			} catch (error) {
				console.error('[Coin] WebGL unavailable', error);
			}
		}
		this.ready.set(true);
		if (this.preview === 'coin' && this.scene) {
			this.scene?.setSides(2, [this.heads(), this.tails(), '']);
			this.scene?.roll(1);
			this.visible.set(true);
		}
	}

	ngOnDestroy(): void {
		if (this.hideTimer) {
			clearTimeout(this.hideTimer);
		}
		this.scene?.destroy();
	}
}
