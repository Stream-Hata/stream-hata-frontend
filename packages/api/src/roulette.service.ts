import type { Game } from '@shared/types/game';
import type {
	RouletteConfig,
	RouletteMode,
	RouletteRound,
	RouletteState,
} from '@shared/types/roulette';
import type { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RouletteService {
	private readonly http = inject(HttpClient);

	config(): Observable<RouletteConfig> {
		return this.http.get<RouletteConfig>('rgg-sync/roulette/config');
	}

	saveConfig(config: RouletteConfig): Observable<RouletteConfig> {
		return this.http.put<RouletteConfig>('rgg-sync/roulette/config', config);
	}

	state(): Observable<RouletteState> {
		return this.http.get<RouletteState>('rgg-sync/roulette/state');
	}

	spin(mode?: RouletteMode): Observable<RouletteRound> {
		return this.http.post<RouletteRound>('rgg-sync/roulette/spin', { mode });
	}

	reset(): Observable<RouletteState> {
		return this.http.post<RouletteState>('rgg-sync/roulette/reset', {});
	}

	history(limit = 20): Observable<{ items: RouletteRound[] }> {
		return this.http.get<{ items: RouletteRound[] }>('rgg-sync/roulette/history', {
			params: { limit },
		});
	}

	reel(limit = 24): Observable<{ items: Game[] }> {
		return this.http.get<{ items: Game[] }>('rgg-sync/roulette/reel', {
			params: { limit },
		});
	}
}
