import type { Game, GameFilters, GameListResponse, GamePlatform } from '@shared/types/game';
import type { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface AdminUser {
	id: number;
	username: string;
	displayName: string;
	twitchId: number;
	avatar?: string;
	hasToken: boolean;
	banned: boolean;
	banReason: string;
	bannedAt?: string;
	updatedAt: string;
}

export interface SearchAlias {
	term: string;
	replacement: string;
	updatedAt: string;
}

export interface ImportStatus {
	total: number;
	sources: string;
	rawg: {
		cursor: { year: number; page: number };
		quota: {
			month: string;
			count: number;
			limit: number;
			pausedUntil?: string;
			lastError?: string;
			rewindYear?: number;
		};
	};
	igdb: { cursor: { offset: number; done: boolean } };
}

@Injectable({ providedIn: 'root' })
export class GamesCatalogService {
	private readonly http = inject(HttpClient);

	list(filters: GameFilters): Observable<GameListResponse> {
		return this.http.get<GameListResponse>('rgg-sync/catalog/games', {
			params: this.params(filters),
		});
	}

	search(query: string, limit = 12): Observable<{ items: Game[] }> {
		return this.http.get<{ items: Game[] }>('rgg-sync/catalog/games/search', {
			params: new HttpParams().set('q', query).set('limit', limit),
		});
	}

	updateGame(slug: string, patch: Partial<Game>): Observable<Game> {
		return this.http.put<Game>(`rgg-sync/catalog/games/${encodeURIComponent(slug)}`, patch);
	}

	deleteGame(slug: string): Observable<{ deleted: boolean }> {
		return this.http.delete<{ deleted: boolean }>(`rgg-sync/catalog/games/${encodeURIComponent(slug)}`);
	}

	get(slug: string, refresh = false): Observable<Game> {
		return this.http.get<Game>(`rgg-sync/catalog/games/${encodeURIComponent(slug)}`, {
			params: refresh ? { refresh: '1' } : {},
		});
	}

	importStatus(): Observable<ImportStatus> {
		return this.http.get<ImportStatus>('rgg-sync/catalog/import/status');
	}

	resumeRawg(): Observable<{ quota: { count: number; limit: number; pausedUntil?: string } }> {
		return this.http.post<{ quota: { count: number; limit: number; pausedUntil?: string } }>(
			'rgg-sync/catalog/import/rawg/resume',
			{},
		);
	}

	adminUsers(): Observable<{ items: AdminUser[] }> {
		return this.http.get<{ items: AdminUser[] }>('rgg-sync/admin/users');
	}

	deleteUser(id: number): Observable<{ deleted: boolean }> {
		return this.http.delete<{ deleted: boolean }>('rgg-sync/admin/users', { params: { id } });
	}

	adminUser(id: number): Observable<AdminUser> {
		return this.http.get<AdminUser>(`rgg-sync/admin/users/${id}`);
	}

	setUserBan(id: number, banned: boolean, reason: string): Observable<AdminUser> {
		return this.http.post<AdminUser>(`rgg-sync/admin/users/${id}/ban`, { banned, reason });
	}

	searchAliases(gameSlug = ''): Observable<{ items: SearchAlias[] }> {
		return this.http.get<{ items: SearchAlias[] }>('rgg-sync/catalog/search-aliases', {
			params: gameSlug ? { gameSlug } : {},
		});
	}

	saveSearchAlias(term: string, replacement: string, gameSlug = ''): Observable<{ ok: boolean }> {
		return this.http.post<{ ok: boolean }>('rgg-sync/catalog/search-aliases', {
			term,
			replacement,
			gameSlug,
		});
	}

	deleteSearchAlias(term: string, gameSlug = ''): Observable<{ ok: boolean }> {
		return this.http.delete<{ ok: boolean }>('rgg-sync/catalog/search-aliases', {
			params: gameSlug ? { term, gameSlug } : { term },
		});
	}

	refreshCatalog(): Observable<{ updated: number; total: number }> {
		return this.http.post<{ updated: number; total: number }>(
			'rgg-sync/catalog/games/refresh',
			{},
		);
	}

	importSearch(
		query: string,
		source = 'rawg',
	): Observable<{ imported: number; skipped: number; total: number; items?: Game[] }> {
		return this.http.post<{ imported: number; skipped: number; total: number; items?: Game[] }>(
			'rgg-sync/catalog/import/search',
			{ query, source },
		);
	}

	import(options: {
		source: string;
		limit: number;
		minRating: number;
		order: string;
		yearFrom: number;
		yearTo: number;
		onlyMissing: boolean;
	}): Observable<{ imported: number; skipped: number; total: number; running?: boolean }> {
		return this.http.post<{ imported: number; skipped: number; total: number }>(
			'rgg-sync/catalog/import',
			options,
		);
	}

	platforms(): Observable<{ items: GamePlatform[] }> {
		return this.http.get<{ items: GamePlatform[] }>('rgg-sync/catalog/platforms');
	}

	private params(filters: GameFilters): HttpParams {
		let params = new HttpParams();

		for (const [key, value] of Object.entries(filters)) {
			if (value === undefined || value === null || value === '') {
				continue;
			}

			params = params.set(key, String(value));
		}

		return params;
	}
}
