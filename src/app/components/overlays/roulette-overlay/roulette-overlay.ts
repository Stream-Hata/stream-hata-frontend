import type { Game } from '@shared/types/game';
import type { RouletteRound, RouletteState } from '@shared/types/roulette';
import { Component, DestroyRef, inject, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouletteService } from '@shared/services/roulette.service';
import { DEFAULT_ROULETTE_CONFIG } from '@shared/types/roulette';
import { timer } from 'rxjs';
import { RouletteStage } from '../../widgets/roulette-stage/roulette-stage';

@Component({
	imports: [RouletteStage],
	selector: 'app-roulette-overlay',
	styleUrl: './roulette-overlay.scss',
	templateUrl: './roulette-overlay.html',
})
export class RouletteOverlay implements OnDestroy {
	private readonly roulette = inject(RouletteService);
	private readonly destroyRef = inject(DestroyRef);
	private lastRound = '';
	private initialized = false;
	private hideTimer: ReturnType<typeof setTimeout> | null = null;
	readonly visible = signal(false);

	readonly state = signal<RouletteState>({
		config: DEFAULT_ROULETTE_CONFIG,
		history: [],
		eliminated: [],
		remaining: 0,
	});

	readonly round = signal<RouletteRound | null>(null);
	readonly filler = signal<Game[]>([]);
	readonly spinning = signal(false);

	constructor() {
		timer(0, 1500)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.poll());

		this.roulette
			.reel(18)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((response) => this.filler.set(response.items));
	}

	private poll(): void {
		this.roulette
			.state()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (state) => {
					this.state.set(state);
					const latest = state.history[0];

					if (!this.initialized) {
						this.initialized = true;
						this.lastRound = latest?.id ?? '';

						return;
					}

					if (latest && latest.id !== this.lastRound) {
						this.lastRound = latest.id;
						this.round.set(latest);
						this.spinning.set(true);
						this.visible.set(true);

						if (this.hideTimer) {
							clearTimeout(this.hideTimer);
						}
						this.hideTimer = setTimeout(() => this.visible.set(false), 8000);
						timer(4000)
							.pipe(takeUntilDestroyed(this.destroyRef))
							.subscribe(() => {
								this.spinning.set(false);
								this.roulette
									.reel(18)
									.pipe(takeUntilDestroyed(this.destroyRef))
									.subscribe((response) => this.filler.set(response.items));
							});
					}
				},
				error: () => undefined,
			});
	}

	ngOnDestroy(): void {
		if (this.hideTimer) {
			clearTimeout(this.hideTimer);
		}
	}
}
