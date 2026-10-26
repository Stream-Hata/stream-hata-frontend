import type { MusicListResponse, Track } from '@shared/types/music';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { MusicService } from '@shared/services/music.service';
import { WidgetConfigService, type WidgetConfig } from '@shared/services/widgets.service';
import { catchError, of, switchMap, timer } from 'rxjs';

@Component({
	selector: 'app-nowplaying-overlay',
	styleUrl: './nowplaying-overlay.scss',
	templateUrl: './nowplaying-overlay.html',
})
export class NowPlayingOverlay {
	private readonly music = inject(MusicService);
	private readonly configService = inject(WidgetConfigService);
	private readonly sanitizer = inject(DomSanitizer);

	readonly state = toSignal(
		timer(0, 5000).pipe(
			switchMap(() => this.music.list().pipe(catchError(() => of(null as MusicListResponse | null)))),
		),
		{ initialValue: null as MusicListResponse | null },
	);
	readonly config = toSignal(
		this.configService.get('nowplaying').pipe(
			catchError(() => of({ config: {} as WidgetConfig })),
		),
		{ initialValue: { config: {} as WidgetConfig } },
	);
	readonly current = computed<Track | null>(() => this.state()?.tracks?.[0] ?? null);
	readonly showVideo = computed(() => this.config().config.showVideo !== false);
	readonly videoUrl = computed<SafeResourceUrl | null>(() => {
		const track = this.current();

		if (!track?.videoId || !this.showVideo()) {
			return null;
		}

		return this.sanitizer.bypassSecurityTrustResourceUrl(
			`https://www.youtube.com/embed/${encodeURIComponent(track.videoId)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${encodeURIComponent(track.videoId)}&modestbranding=1&rel=0`,
		);
	});
	readonly duration = computed(() => {
		const seconds = this.current()?.durationSeconds ?? 0;

		return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
	});
}
