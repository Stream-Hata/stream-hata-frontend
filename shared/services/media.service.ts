import type { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface ResolvedMedia {
	url: string;
	type: string;
}

@Injectable({ providedIn: 'root' })
export class MediaService {
	private readonly http = inject(HttpClient);

	resolve(url: string): Observable<ResolvedMedia> {
		return this.http.get<ResolvedMedia>('rgg-sync/media/resolve', { params: { url } });
	}

	resolveAudio(url: string): Observable<ResolvedMedia> {
		return this.http.get<ResolvedMedia>('rgg-sync/media/audio', { params: { url } });
	}

	playUrl(url: string): string {
		const trimmed = url.trim();

		if (!trimmed) {
			return '';
		}

		if (trimmed.startsWith('/') || /^https?:\/\/[^/]+\.(mp3|ogg|oga|wav|m4a|aac|flac|opus|webm)(\?|$)/i.test(trimmed)) {
			return trimmed;
		}

		return `rgg-sync/media/play?url=${encodeURIComponent(trimmed)}`;
	}

	upload(file: File): Observable<ResolvedMedia> {
		const form = new FormData();

		form.append('file', file);

		return this.http.post<ResolvedMedia>('rgg-sync/media/upload', form);
	}
}
