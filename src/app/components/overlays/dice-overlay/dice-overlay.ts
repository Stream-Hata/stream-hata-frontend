import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, timer } from 'rxjs';

interface DiceState {
	formula: string;
	result: number;
	rolls: number[];
	viewer: string;
	rolledAt: string;
}

const EMPTY: DiceState = { formula: '1d6', result: 6, rolls: [6], viewer: '', rolledAt: '' };

@Component({
	selector: 'app-dice-overlay',
	styleUrl: './dice-overlay.scss',
	templateUrl: './dice-overlay.html',
})
export class DiceOverlay {
	private readonly http = inject(HttpClient);
	private lastRolledAt = '';
	readonly rolling = signal(false);

	readonly state = toSignal(
		timer(0, 700).pipe(
			switchMap(() =>
				this.http
					.get<DiceState>('rgg-sync/dice', { params: { t: Date.now() } })
					.pipe(catchError(() => of(EMPTY))),
			),
		),
		{ initialValue: EMPTY },
	);

	readonly result = computed(() => this.state().result || 6);
	readonly formula = computed(() => this.state().formula || '1d6');
	readonly viewer = computed(() => this.state().viewer || '');
	readonly rolls = computed(() => this.state().rolls ?? []);

	constructor() {
		effect(() => {
			const rolledAt = this.state().rolledAt;
			if (!rolledAt || rolledAt === this.lastRolledAt) {
				return;
			}

			this.lastRolledAt = rolledAt;
			this.rolling.set(true);
			setTimeout(() => this.rolling.set(false), 900);
		});
	}
}
