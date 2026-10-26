import type { ResolveFn } from '@angular/router';
import type { GameListResponse } from '@shared/types/game';
import { inject } from '@angular/core';
import { GamesCatalogService } from '@shared/services/games-catalog.service';
import { catchError, of } from 'rxjs';

export const gamesResolver: ResolveFn<GameListResponse> = () => {
	const catalog = inject(GamesCatalogService);

	return catalog
		.list({
			q: '',
			platform: '',
			tier: '',
			age: '',
			emulator: null,
			page: 1,
			pageSize: 24,
			sort: 'title',
			order: 'asc',
		})
		.pipe(catchError(() => of({ items: [], total: 0, page: 1, pageSize: 24, facets: { platforms: [], tiers: [], ages: [] } })));
};
