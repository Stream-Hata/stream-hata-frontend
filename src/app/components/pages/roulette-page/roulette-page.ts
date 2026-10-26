import type { Game } from '@shared/types/game';
import type {
	RouletteConfig,
	RouletteMode,
	RouletteRound,
} from '@shared/types/roulette';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RouletteService } from '@shared/services/roulette.service';
import { DEFAULT_ROULETTE_CONFIG } from '@shared/types/roulette';
import { TuiButton, TuiIcon, TuiSelectLike, TuiTextfield } from '@taiga-ui/core';
import { TuiBadge, TuiChevron, TuiDataListWrapper } from '@taiga-ui/kit';
import { timer } from 'rxjs';
import { RouletteStage } from '../../widgets/roulette-stage/roulette-stage';

function normalizeConfig(config: RouletteConfig): RouletteConfig {
	return {
		...DEFAULT_ROULETTE_CONFIG,
		...config,
		filters: {
			...DEFAULT_ROULETTE_CONFIG.filters,
			...config.filters,
			platforms: config.filters?.platforms ?? [],
			tiers: config.filters?.tiers ?? [],
			ages: config.filters?.ages ?? [],
		},
		weights: { ...DEFAULT_ROULETTE_CONFIG.weights, ...config.weights },
		appearance: { ...DEFAULT_ROULETTE_CONFIG.appearance, ...config.appearance },
		audio: { ...DEFAULT_ROULETTE_CONFIG.audio, ...config.audio },
		reveal: { ...DEFAULT_ROULETTE_CONFIG.reveal, ...config.reveal },
	};
}

@Component({
	imports: [ReactiveFormsModule, RouterLink, TuiBadge, TuiButton, TuiChevron, TuiDataListWrapper, TuiIcon, TuiSelectLike, TuiTextfield, RouletteStage],
	selector: 'app-roulette-page',
	styleUrl: './roulette-page.scss',
	templateUrl: './roulette-page.html',
})
export default class RoulettePage {
	private readonly roulette = inject(RouletteService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly route = inject(ActivatedRoute);

	readonly config = signal<RouletteConfig>(DEFAULT_ROULETTE_CONFIG);
	readonly mode = signal<RouletteMode>('classic');
	readonly modeControl = new FormControl<RouletteMode>('classic', { nonNullable: true });
	readonly round = signal<RouletteRound | null>(null);
	readonly filler = signal<Game[]>([]);
	readonly history = signal<RouletteRound[]>([]);
	readonly spinning = signal(false);
	readonly error = signal('');
	readonly remaining = signal(0);
	readonly modeValues: RouletteMode[] = ['classic', 'cat-bag', 'elimination'];
	readonly modeLabels = ['Classic', 'Кот в мешке', 'На выбывание'];
	readonly modes: Array<{ value: RouletteMode; label: string }> = [
		{ value: 'classic', label: 'Classic' },
		{ value: 'cat-bag', label: 'Кот в мешке' },
		{ value: 'elimination', label: 'На выбывание' },
	];

	constructor() {
		const preload = this.route.snapshot.data['roulette'] as import('./roulette-resolver').RoulettePreload | undefined;

		if (preload) {
			this.config.set(normalizeConfig(preload.config));
			this.mode.set(preload.config.mode);
			this.modeControl.setValue(preload.config.mode);
			this.history.set(preload.state.history);
			this.remaining.set(preload.state.remaining);
			this.filler.set(preload.filler);
		}

		if (!preload) {
		this.roulette
			.config()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (config) => {
					this.config.set(normalizeConfig(config));
					this.mode.set(config.mode);
					this.modeControl.setValue(config.mode);
				},
				error: () => undefined,
			});

		this.roulette
			.state()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (state) => {
					this.history.set(state.history);
					this.remaining.set(state.remaining);
				},
				error: () => undefined,
			});

		this.loadFiller();
		}
	}

	spin(): void {
		if (this.spinning()) {
			return;
		}

		this.error.set('');
		this.spinning.set(true);
		this.loadFiller();

		this.roulette
			.spin(this.mode())
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (round) => {
					this.round.set(round);
					timer(6900)
						.pipe(takeUntilDestroyed(this.destroyRef))
						.subscribe(() => {
							this.spinning.set(false);
							this.history.update((history) => [round, ...history].slice(0, 20));
							this.roulette
								.state()
								.pipe(takeUntilDestroyed(this.destroyRef))
								.subscribe((state) => this.remaining.set(state.remaining));
						});
				},
				error: (response) => {
					this.spinning.set(false);
					this.error.set(response.error?.error ?? 'Не удалось запустить рулетку');
				},
			});
	}

	reset(): void {
		this.roulette
			.reset()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (state) => {
					this.round.set(null);
					this.history.set(state.history);
					this.remaining.set(state.remaining);
				},
				error: () => undefined,
			});
	}

	setModeLabel(label: string): void {
		const index = this.modeLabels.indexOf(label);

		if (index < 0) {
			return;
		}

		const mode = this.modeValues[index];
		this.mode.set(mode);
		this.modeControl.setValue(mode);
		this.roulette
			.saveConfig({ ...this.config(), mode })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((config) => this.config.set(config));
	}

	private loadFiller(): void {
		this.roulette
			.reel(18)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => this.filler.set(response.items),
				error: () => undefined,
			});
	}
}
