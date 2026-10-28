import { AfterViewInit, Component, computed, effect, ElementRef, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, timer } from 'rxjs';
import { DiceScene } from './dice-scene';

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
export class DiceOverlay implements AfterViewInit, OnDestroy {
	@ViewChild('diceHost') private diceHost?: ElementRef<HTMLElement>;
	private readonly http = inject(HttpClient);
	private readonly previewSides = Number(new URLSearchParams(location.search).get('preview') ?? 0);
	private scene?: DiceScene;
	private lastRolledAt = '';
	private hideTimer: ReturnType<typeof setTimeout> | null = null;
	readonly ready = signal(false);
	readonly visible = signal(false);
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

	constructor() {
		effect(() => {
			if (this.previewSides > 0) {
				return;
			}

			const sides = this.sides();
			const rolledAt = this.state().rolledAt;
			const result = this.result();

			if (!this.ready() || !this.scene) {
				return;
			}

			this.scene.setSides(sides);

			if (!rolledAt || rolledAt.startsWith('0001-') || rolledAt === this.lastRolledAt) {
				return;
			}

			this.lastRolledAt = rolledAt;
			this.visible.set(true);
			this.rolling.set(true);
			this.scene.roll(result);
			setTimeout(() => this.rolling.set(false), 950);

			if (this.hideTimer) {
				clearTimeout(this.hideTimer);
			}
			this.hideTimer = setTimeout(() => this.visible.set(false), 8000);
		});
	}

	ngAfterViewInit(): void {
		if (!this.diceHost) {
			return;
		}

		this.scene = new DiceScene(this.diceHost.nativeElement);
		if (this.previewSides > 0) {
			this.scene.setSides(this.previewSides);
			this.scene.roll(Math.min(3, this.previewSides));
			this.visible.set(true);
		}
		this.ready.set(true);
	}

	ngOnDestroy(): void {
		if (this.hideTimer) {
			clearTimeout(this.hideTimer);
		}
		this.scene?.destroy();
	}
}
