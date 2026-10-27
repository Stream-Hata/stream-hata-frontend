import type { EmotesResponse, LiveChatMessage } from '@shared/types/chat';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ChatLiveService {
	private readonly http = inject(HttpClient);

	recent(limit = 100, mode: 'all' | 'original' = 'all') {
		return this.http.get<{ messages: LiveChatMessage[] }>(
			`rgg-sync/chat/recent?limit=${limit}&mode=${mode}`,
		);
	}

	emotes() {
		return this.http.get<EmotesResponse>('rgg-sync/emotes');
	}

	badges() {
		return this.http.get<{ badges: Record<string, string> }>('rgg-sync/chat/badges');
	}
}
