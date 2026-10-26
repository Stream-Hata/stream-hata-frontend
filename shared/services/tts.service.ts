import type { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface TtsVoices {
	voices: string[];
	models: string[];
	configured: boolean;
	providers?: string[];
	fishConfigured?: boolean;
}

export interface TtsResult {
	url?: string;
	voice?: string;
	model?: string;
	skipped?: boolean;
	reason?: string;
}

@Injectable({ providedIn: 'root' })
export class TtsService {
	private readonly http = inject(HttpClient);

	voices(): Observable<TtsVoices> {
		return this.http.get<TtsVoices>('rgg-sync/donations/tts/voices');
	}

	speak(
		donationId: string,
		text: string,
		voice: string,
		model: string,
		provider = 'auto',
	): Observable<TtsResult> {
		return this.http.post<TtsResult>('rgg-sync/donations/tts', {
			donationId,
			text,
			voice,
			model,
			provider,
		});
	}
}
