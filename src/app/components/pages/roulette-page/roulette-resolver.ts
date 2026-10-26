import type { ResolveFn } from '@angular/router';
import type { Game } from '@shared/types/game';
import type { RouletteConfig, RouletteState } from '@shared/types/roulette';
import { inject } from '@angular/core';
import { RouletteService } from '@shared/services/roulette.service';
import { forkJoin, map } from 'rxjs';

export interface RoulettePreload {
	config: RouletteConfig;
	state: RouletteState;
	filler: Game[];
}

export const rouletteResolver: ResolveFn<RoulettePreload> = () => {
	const service = inject(RouletteService);

	return forkJoin({
		config: service.config(),
		state: service.state(),
		reel: service.reel(18),
	}).pipe(
		map(({ config, state, reel }) => ({ config, state, filler: reel.items })),
	);
};
