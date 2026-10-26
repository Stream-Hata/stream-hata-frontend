import type { MusicListResponse, Track } from '@shared/types/music';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MusicService } from '@shared/services/music.service';
import { catchError, of, switchMap, timer } from 'rxjs';

@Component({
	selector: 'app-music-overlay',
	styleUrl: './music-overlay.scss',
	templateUrl: './music-overlay.html',
})
export class MusicOverlay {
	private readonly music = inject(MusicService);

	readonly state = toSignal(
		timer(0, 10000).pipe(
			switchMap(() =>
				this.music.list().pipe(catchError(() => of(null as MusicListResponse | null))),
			),
		),
		{ initialValue: null as MusicListResponse | null },
	);

	readonly current = computed<Track | null>(() => this.state()?.tracks?.[0] ?? null);
	readonly tracks = computed(() => (this.state()?.tracks ?? []).slice(0, 10));
	readonly duration = computed(() => {
		const seconds = this.current()?.durationSeconds ?? 0;

		return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
	});
}
