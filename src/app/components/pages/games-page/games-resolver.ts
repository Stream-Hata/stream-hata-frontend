import type { ResolveFn } from '@angular/router';
import type { GameListResponse } from '@shared/types/game';
import { inject } from '@angular/core';
import { GamesCatalogService } from '@shared/services/games-catalog.service';
import { catchError, of } from 'rxjs';

export const gamesResolver: ResolveFn<GameListResponse> = (route) => {
	const catalog = inject(GamesCatalogService);
	const page = Math.max(1, Number(route.queryParamMap.get('page') ?? 1) || 1);

	return catalog
		.list({
			q: '',
			platform: '',
			tier: '',
			age: '',
			emulator: null,
			page,
			pageSize: 24,
			sort: 'title',
			order: 'asc',
		})
		.pipe(catchError(() => of({ items: [], total: 0, page: 1, pageSize: 24, facets: { platforms: [], tiers: [], ages: [] } })));
};
