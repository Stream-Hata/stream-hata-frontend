import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, timer } from 'rxjs';

type GameMode = 'coin' | 'random';

interface GameState {
	kind: string;
	label: string;
	result: string;
	viewer: string;
	rolledAt: string;
}

const EMPTY: GameState = { kind: '', label: '', result: '', viewer: '', rolledAt: '' };

@Component({
	selector: 'app-game-overlay',
	styleUrl: './game-overlay.scss',
	templateUrl: './game-overlay.html',
})
export class GameOverlay {
	readonly mode = input<GameMode>('coin');
	private readonly http = inject(HttpClient);
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
	readonly result = computed(() => this.active() ? this.state().result : '');
	readonly label = computed(() => this.active() ? this.state().label : '');
	readonly viewer = computed(() => this.active() ? this.state().viewer : '');
	readonly coinSide = computed(() => this.result().toLowerCase() === 'решка' ? 'tails' : 'heads');

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
