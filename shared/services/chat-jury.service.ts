import type { ChatJuryPublic, ChatJuryResult, ChatJurySettings } from '@shared/types/chat-jury';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ChatJuryService {
	private readonly http = inject(HttpClient);

	getCurrent() {
		return this.http.get<ChatJuryPublic | null>('rgg-sync/chat-jury/current');
	}

	getResult() {
		return this.http.get<ChatJuryResult | null>('rgg-sync/chat-jury/result');
	}

	startTest(text: string) {
		return this.http.post<ChatJuryPublic | null>('rgg-sync/chat-jury/start', {
			text,
			author: 'streamer',
			displayName: 'Стример',
			confidence: 0.9,
		});
	}

	finish() {
		return this.http.post<ChatJuryResult | null>('rgg-sync/chat-jury/finish', {});
	}

	getSettings() {
		return this.http.get<ChatJurySettings>('rgg-sync/chat-jury/settings');
	}

	saveSettings(settings: ChatJurySettings) {
		return this.http.patch<ChatJurySettings>('rgg-sync/chat-jury/settings', settings);
	}
}
