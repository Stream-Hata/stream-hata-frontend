import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface GameSuggestion {
	id: number;
	userLogin: string;
	userDisplayName: string;
	title: string;
	platform: string;
	year: number;
	links: string;
	comment: string;
	coverUrl: string;
	screenshots: string;
	description: string;
	genres: string;
	developer: string;
	publisher: string;
	website: string;
	services: string[];
	status: 'pending' | 'approved' | 'rejected';
	moderatorLogin: string;
	moderatorComment: string;
	createdAt: string;
	updatedAt: string;
}

export interface GameSuggestionPayload {
	title: string;
	platform: string;
	year: number;
	links: string;
	comment: string;
	coverUrl: string;
	screenshots: string;
	description: string;
	genres: string;
	developer: string;
	publisher: string;
	website: string;
	services: string[];
}

@Injectable({ providedIn: 'root' })
export class SuggestionsService {
	private readonly http = inject(HttpClient);

	create(payload: GameSuggestionPayload) {
		return this.http.post<GameSuggestion>('rgg-sync/game-suggestions', payload);
	}

	mine() {
		return this.http.get<{ items: GameSuggestion[]; count: number }>(
			'rgg-sync/game-suggestions/mine',
		);
	}

	list(status = '') {
		return this.http.get<{ items: GameSuggestion[]; count: number }>(
			`rgg-sync/game-suggestions/admin?status=${encodeURIComponent(status)}`,
		);
	}

	review(id: number, status: GameSuggestion['status'], comment: string) {
		return this.http.patch<{ ok: boolean }>(`rgg-sync/game-suggestions/admin/${id}`, {
			status,
			comment,
		});
	}
}
