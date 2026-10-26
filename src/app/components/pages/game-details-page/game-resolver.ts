import type { ResolveFn } from '@angular/router';
import type { Game } from '@shared/types/game';
import { inject } from '@angular/core';
import { GamesCatalogService } from '@shared/services/games-catalog.service';
import { catchError, of } from 'rxjs';

export const gameResolver: ResolveFn<Game | null> = (route) => {
	const slug = route.paramMap.get('slug') ?? '';

	if (!slug) {
		return of(null);
	}

	return inject(GamesCatalogService).get(slug).pipe(catchError(() => of(null)));
};
