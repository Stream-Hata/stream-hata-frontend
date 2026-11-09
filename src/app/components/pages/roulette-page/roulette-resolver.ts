import type { ResolveFn } from '@angular/router';
import type { Game } from '@shared/types/game';
import { DEFAULT_ROULETTE_CONFIG, type RouletteConfig, type RouletteState } from '@shared/types/roulette';
import { inject } from '@angular/core';
import { RouletteService } from '@shared/services/roulette.service';
import { catchError, forkJoin, map, of } from 'rxjs';

export interface RoulettePreload {
	config: RouletteConfig;
	state: RouletteState;
	filler: Game[];
}

export const rouletteResolver: ResolveFn<RoulettePreload> = () => {
	const service = inject(RouletteService);

	return forkJoin({
		config: service.config().pipe(catchError(() => of(DEFAULT_ROULETTE_CONFIG))),
		state: service.state().pipe(
			catchError(() =>
				of({
					config: DEFAULT_ROULETTE_CONFIG,
					history: [],
					eliminated: [],
					remaining: 0,
				} satisfies RouletteState),
			),
		),
		reel: service.reel(18).pipe(catchError(() => of({ items: [] }))),
	}).pipe(
		map(({ config, state, reel }) => ({ config, state, filler: reel.items })),
	);
};
