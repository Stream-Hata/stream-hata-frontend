import type { ModerationFilters, ModerationState } from '@shared/types/automation';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface ModerationAction {
	action: 'ban' | 'timeout' | 'delete';
	userId: string;
	displayName: string;
	messageId?: string;
	reason?: string;
	seconds?: number;
}

export interface WordListPreset {
	id: string;
	name: string;
	description: string;
	words: string[];
}

@Injectable({ providedIn: 'root' })
export class ModerationService {
	private readonly http = inject(HttpClient);

	getState() {
		return this.http.get<ModerationState>('rgg-sync/moderation');
	}

	saveFilters(filters: ModerationFilters) {
		return this.http.post<ModerationFilters>('rgg-sync/moderation', filters);
	}

	wordlists() {
		return this.http.get<{ presets: WordListPreset[] }>('rgg-sync/moderation/wordlists');
	}

	fetchWordlist(url: string) {
		return this.http.post<{ words: string[] }>('rgg-sync/moderation/wordlists/fetch', { url });
	}

	action(payload: ModerationAction) {
		return this.http.post<{ ok: boolean }>('rgg-sync/moderation/action', payload);
	}
}
