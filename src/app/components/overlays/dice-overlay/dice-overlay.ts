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
	readonly polygonPoints = computed(() => {
		const count = this.shapeVertices();
		const points = Array.from({ length: count }, (_, index) => {
			const angle = (Math.PI * 2 * index) / count - Math.PI / 2;

			return `${100 + Math.cos(angle) * 82},${100 + Math.sin(angle) * 82}`;
		});

		return points.join(' ');
	});
	readonly facetLines = computed(() => {
		const count = this.shapeVertices();

		return Array.from({ length: count }, (_, index) => {
			const angle = (Math.PI * 2 * index) / count - Math.PI / 2;

			return {
				x: 100 + Math.cos(angle) * 82,
				y: 100 + Math.sin(angle) * 82,
			};
		});
	});
	readonly facetShades = computed(() => {
		const count = this.shapeVertices();
		const points = Array.from({ length: count }, (_, index) => {
			const angle = (Math.PI * 2 * index) / count - Math.PI / 2;

			return `${100 + Math.cos(angle) * 82},${100 + Math.sin(angle) * 82}`;
		});

		return points.map((point, index) => `100,100 ${point} ${points[(index + 1) % count]}`);
	});
	readonly polyTransform = computed(() => 'rotateX(-10deg) rotateY(-8deg)');
	readonly showOverflow = computed(() => this.result() > this.sides() || this.sides() > 20);
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

	shapeVertices(): number {
		switch (this.sides()) {
			case 4: return 3;
			case 8: return 4;
			case 10: return 5;
			case 12: return 6;
			case 20: return 8;
			default: return Math.min(8, Math.max(3, this.sides()));
		}
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
