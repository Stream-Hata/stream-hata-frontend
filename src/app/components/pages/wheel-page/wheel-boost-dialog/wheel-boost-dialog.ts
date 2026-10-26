import type { HttpErrorResponse } from '@angular/common/http';
import type { WheelBoost, WheelParticipant } from '@shared/types/automation';
import { DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GamesService } from '@shared/services/engagement.services';
import { TuiButton } from '@taiga-ui/core';
import { catchError, of, timeout, timer } from 'rxjs';

const CELL_WIDTH = 84;
const REEL_WIDTH = CELL_WIDTH * 3;
const TAPE_SIZE = 36;
const WINNER_INDEX = 28;
const DEFAULT_MULTIPLIERS = [0, 1, 2, 3, 5, 10, 100];

@Component({
	imports: [DecimalPipe, TuiButton],
	selector: 'app-wheel-boost-dialog',
	styleUrl: './wheel-boost-dialog.scss',
	templateUrl: './wheel-boost-dialog.html',
})
export class WheelBoostDialog {
	private readonly games = inject(GamesService);
	private readonly destroyRef = inject(DestroyRef);
	readonly participant = input<WheelParticipant | null>(null);
	readonly multipliers = input<number[]>(DEFAULT_MULTIPLIERS);
	readonly boosts = input<WheelBoost[]>([]);
	readonly closed = output<void>();
	readonly applied = output<string>();
	readonly errorText = signal('');
	readonly started = signal(false);
	readonly spinning = signal(false);
	readonly multiplier = signal<number | null>(null);
	readonly baseBet = signal(0);
	readonly bet = signal(0);
	readonly activeMultipliers = signal<number[]>(DEFAULT_MULTIPLIERS);
	readonly reel = signal<number[]>([]);
	readonly offset = signal(0);
	readonly resetting = signal(false);
	readonly selectedIndex = signal(-1);
	readonly cellWidth = CELL_WIDTH;
	readonly delta = computed(() => Math.max(0, this.bet() - this.baseBet()));
	readonly boostOdds = computed(() => {
		const boosts = this.boosts();
		const values = this.multipliers().length ? this.multipliers() : DEFAULT_MULTIPLIERS;
		const source = boosts.length ? boosts : values.map((value) => ({ value, weight: 1 }));
		const total = source.reduce((sum, boost) => sum + boost.weight, 0) || 1;

		return source.map((boost) => ({ ...boost, chance: (boost.weight / total) * 100 }));
	});

	readonly outcomeText = computed(() => {
		const value = this.multiplier();

		if (value === null) {
			return '';
		}

		if (value === 0) {
			return `Ставка ${this.baseBet()} сгорела`;
		}

		if (value === 1) {
			return `Ставка осталась ${this.baseBet()}`;
		}

		return `Ставка ${this.baseBet()} → ${this.bet()}`;
	});

	constructor() {
		this.reel.set(this.buildTape(DEFAULT_MULTIPLIERS, null));
		const participant = this.participant();

		if (!participant) {
			return;
		}

		this.baseBet.set(participant.bet);
		this.bet.set(participant.bet);
	}

	start(): void {
		if (this.started()) {
			return;
		}

		const multipliers = this.multipliers();

		this.started.set(true);
		this.activeMultipliers.set(multipliers.length ? [...multipliers] : DEFAULT_MULTIPLIERS);
		this.reel.set(this.buildTape(this.activeMultipliers(), null));
		this.spin();
	}

	spin(): void {
		const participant = this.participant();

		if (!participant) {
			return;
		}

		this.spinning.set(true);
		this.multiplier.set(null);
		this.errorText.set('');
		this.selectedIndex.set(-1);
		this.resetting.set(true);
		this.offset.set(0);

		this.games
			.boostWheelLot(participant.userId)
			.pipe(
				timeout(5000),
				catchError((error: HttpErrorResponse) => {
					this.errorText.set(error.error?.error ?? 'Не удалось применить буст');
					this.offset.set(0);
					this.spinning.set(false);

					return of(null);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				if (!result) {
					return;
				}

				const values = this.activeMultipliers();
				this.reel.set(this.buildTape(values, result.multiplier));
				this.selectedIndex.set(WINNER_INDEX);

				const target = REEL_WIDTH / 2 - (WINNER_INDEX * CELL_WIDTH + CELL_WIDTH / 2);

				// Let the browser paint the reset position before starting the transition.
				timer(60)
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe(() => this.resetting.set(false));

				timer(90)
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe(() => this.offset.set(target));

				timer(2500)
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe(() => {
						this.multiplier.set(result.multiplier);
						this.bet.set(result.bet);
						this.spinning.set(false);
					});
			});
	}

	private buildTape(values: number[], winner: number | null): number[] {
		const source = values.length ? values : DEFAULT_MULTIPLIERS;
		let seed = 17;
		const tape = Array.from({ length: TAPE_SIZE }, () => {
			seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF;

			return source[seed % source.length] ?? source[0] ?? 0;
		});

		if (winner !== null) {
			tape[WINNER_INDEX] = winner;
		}

		return tape;
	}

	apply(): void {
		this.applied.emit(this.participant()?.userId ?? '');
		this.closed.emit();
	}

	close(): void {
		if (this.spinning()) {
			return;
		}

		if (this.multiplier() !== null) {
			this.applied.emit(this.participant()?.userId ?? '');
		}

		this.closed.emit();
	}
}
