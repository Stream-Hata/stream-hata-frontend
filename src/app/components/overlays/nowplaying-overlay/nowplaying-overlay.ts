import type { MusicListResponse, Track } from '@shared/types/music';
import { Component, computed, DestroyRef, effect, HostListener, inject, signal } from '@angular/core';
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
	private readonly destroyRef = inject(DestroyRef);
	private endTimer: ReturnType<typeof setTimeout> | null = null;
	private advancing = false;
	private queue: string[] = [];

	readonly state = toSignal(
		timer(0, 3000).pipe(
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
	readonly playlist = computed(() =>
		[...(this.state()?.tracks ?? [])].sort(
			(left, right) => Date.parse(left.lastAddedAt) - Date.parse(right.lastAddedAt),
		),
	);
	readonly currentId = signal<string | null>(null);
	readonly current = computed<Track | null>(
		() => this.playlist().find((track) => track.videoId === this.currentId()) ?? null,
	);
	readonly thumbnailFailed = signal(false);
	readonly thumbnailUrl = computed(() => {
		const videoId = this.current()?.videoId;

		return videoId ? `rgg-sync/music/thumbnail?id=${encodeURIComponent(videoId)}` : '';
	});
	readonly showVideo = computed(() => this.config().config.showVideo !== false);
	readonly videoUrl = computed<SafeResourceUrl | null>(() => {
		const track = this.current();

		if (!track?.videoId) {
			return null;
		}

		return this.sanitizer.bypassSecurityTrustResourceUrl(
			`https://www.youtube.com/embed/${encodeURIComponent(track.videoId)}?autoplay=1&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1`,
		);
	});

	constructor() {
		effect(() => {
			const playlist = this.playlist();
			const ids = playlist.map((track) => track.videoId);

			if (!ids.length) {
				this.queue = [];
				this.currentId.set(null);

				return;
			}

			if (!this.queue.length) {
				this.queue = [...ids];
			} else {
				const current = this.currentId();
				const existing = this.queue.filter((id) => ids.includes(id));
				const added = ids.filter((id) => !this.queue.includes(id));
				const index = current ? existing.indexOf(current) : -1;

				if (added.length) {
					existing.splice(index + 1, 0, ...added);
				}

				this.queue = existing;
			}

			if (!this.currentId() || !this.queue.includes(this.currentId() ?? '')) {
				this.currentId.set(this.queue[0]);
			}
		});

		effect(() => {
			this.current()?.videoId;
			this.thumbnailFailed.set(false);
		});

		this.destroyRef.onDestroy(() => this.clearEndTimer());
	}

	@HostListener('window:message', ['$event'])
	onMessage(event: MessageEvent): void {
		if (!event.origin.includes('youtube.com')) {
			return;
		}

		const payload = this.parseMessage(event.data);

		if (payload?.event === 'onStateChange' && payload.info === 0) {
			this.nextTrack();
		}

		if (payload?.event === 'onError') {
			this.nextTrack();
		}
	}

	onVideoLoad(event: Event): void {
		const frame = event.target as HTMLIFrameElement;

		for (const func of ['playVideo', 'unMute']) {
			frame.contentWindow?.postMessage(
				JSON.stringify({ event: 'command', func, args: [] }),
				'*',
			);
		}

		this.scheduleEnd();
	}

	nextTrack(): void {
		if (!this.queue.length || this.advancing) {
			return;
		}

		this.advancing = true;
		const index = this.queue.indexOf(this.currentId() ?? '');
		const next = this.queue[(index + 1) % this.queue.length];

		this.currentId.set(next);
		setTimeout(() => {
			this.advancing = false;
		}, 1000);
	}

	readonly duration = computed(() => {
		const seconds = this.current()?.durationSeconds ?? 0;

		return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
	});

	private scheduleEnd(): void {
		this.clearEndTimer();

		const seconds = this.current()?.durationSeconds ?? 0;

		this.endTimer = setTimeout(
			() => this.nextTrack(),
			Math.max(15, seconds + 2) * 1000,
		);
	}

	private clearEndTimer(): void {
		if (this.endTimer) {
			clearTimeout(this.endTimer);
			this.endTimer = null;
		}
	}

	private parseMessage(data: unknown): { event?: string; info?: number } | null {
		if (typeof data === 'object' && data !== null) {
			return data as { event?: string; info?: number };
		}

		if (typeof data !== 'string') {
			return null;
		}

		try {
			return JSON.parse(data) as { event?: string; info?: number };
		} catch {
			return null;
		}
	}
}
