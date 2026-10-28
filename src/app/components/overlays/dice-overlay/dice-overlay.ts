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
	readonly sides = computed(() => {
		const match = this.formula().match(/(\d*)d(\d+)/i);

		return match ? Math.max(1, Number(match[2])) : 6;
	});
	readonly faceCount = computed(() => Math.min(this.sides(), 20));
	readonly isClassic = computed(() => this.sides() === 6 && this.result() >= 1 && this.result() <= 6);
	readonly prismTransform = computed(() => {
		const index = Math.min(this.faceCount() - 1, Math.max(0, this.result() - 1));
		const angle = -(index * 360) / Math.max(1, this.faceCount());

		return `rotateX(-10deg) rotateY(${angle}deg)`;
	});
	readonly cubeTransform = computed(() => {
		const rotations: Record<number, string> = {
			1: 'rotateX(0deg) rotateY(0deg)',
			2: 'rotateX(0deg) rotateY(180deg)',
			3: 'rotateX(0deg) rotateY(-90deg)',
			4: 'rotateX(0deg) rotateY(90deg)',
			5: 'rotateX(-90deg) rotateY(0deg)',
			6: 'rotateX(90deg) rotateY(0deg)',
		};

		return rotations[this.result()] ?? 'rotateX(0deg) rotateY(0deg)';
	});

	faceValue(face: number): number {
		return face;
	}

	panelTransform(index: number): string {
		return `rotateY(${(index * 360) / Math.max(1, this.faceCount())}deg) translateZ(72px)`;
	}

	panelLabel(index: number): number {
		return index + 1;
	}

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
