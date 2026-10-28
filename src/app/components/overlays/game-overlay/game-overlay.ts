import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { WidgetConfigService, type WidgetConfig } from '@shared/services/widgets.service';
import { catchError, of, switchMap, timer } from 'rxjs';

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
export class GameOverlay {
	readonly mode = input<GameMode>('coin');
	private readonly http = inject(HttpClient);
	private readonly configService = inject(WidgetConfigService);
	private lastRolledAt = '';
	readonly rolling = signal(false);

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
	readonly coinTransform = computed(() => this.coinSide() === 'tails'
		? 'rotateX(8deg) rotateY(180deg)'
		: 'rotateX(8deg) rotateY(0deg)');
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
			if (!this.active() || !rolledAt || rolledAt === this.lastRolledAt) {
				return;
			}

			this.lastRolledAt = rolledAt;
			this.rolling.set(true);
			setTimeout(() => this.rolling.set(false), 1100);
		});
	}
}
