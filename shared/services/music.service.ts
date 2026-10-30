import type { MusicListResponse, Track } from '@shared/types/music';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MusicService {
	private readonly http = inject(HttpClient);

	list() {
		return this.http.get<MusicListResponse>('rgg-sync/music');
	}

	add(url: string, addedBy = 'panel') {
		return this.http.post<Track>('rgg-sync/music', { url, addedBy });
	}

	remove(videoId: string) {
		return this.http.delete<void>(`rgg-sync/music/${videoId}`);
	}

	current() {
		return this.http.get<{ track: Track | null }>('rgg-sync/music/current');
	}

	setCurrent(videoId: string | null) {
		return this.http.post<{ ok: boolean }>('rgg-sync/music/current', { videoId: videoId ?? '' });
	}

	exportToTelegram() {
		return this.http.post<{ ok: boolean; chunks: number; tracks: number }>(
			'rgg-sync/music/telegram',
			{},
		);
	}

	exportUrl(): string {
		return 'rgg-sync/music/export';
	}

	exportCsv() {
		return this.http.get('rgg-sync/music/export', { responseType: 'text' });
	}
}
