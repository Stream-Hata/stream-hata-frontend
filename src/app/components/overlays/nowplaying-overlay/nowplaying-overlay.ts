import type { MusicListResponse, Track } from '@shared/types/music';
import { Component, computed, DestroyRef, effect, ElementRef, HostListener, inject, signal, ViewChild } from '@angular/core';
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
	private gestureTimer: ReturnType<typeof setTimeout> | null = null;
	private advancing = false;
	private queue: string[] = [];

	@ViewChild('player')
	private player?: ElementRef<HTMLIFrameElement>;

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
	readonly reloadKey = signal(0);
	readonly current = computed<Track | null>(
		() => this.playlist().find((track) => track.videoId === this.currentId()) ?? null,
	);
	readonly thumbnailFailed = signal(false);
	readonly playbackStarted = signal(false);
	readonly needsGesture = signal(false);
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
			`https://www.youtube.com/embed/${encodeURIComponent(track.videoId)}?autoplay=1&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}&reload=${this.reloadKey()}`,
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
			this.playbackStarted.set(false);
			this.needsGesture.set(false);
			this.clearEndTimer();
			this.clearGestureTimer();
		});

		this.destroyRef.onDestroy(() => {
			this.clearEndTimer();
			this.clearGestureTimer();
		});
	}

	@HostListener('window:message', ['$event'])
	onMessage(event: MessageEvent): void {
		if (!event.origin.includes('youtube.com')) {
			return;
		}

		const payload = this.parseMessage(event.data);

		if (payload?.event === 'onStateChange') {
			if (payload.info === 0) {
				this.nextTrack();
			}

			if (payload.info === 1 || payload.info === 3) {
				this.playbackStarted.set(true);
				this.needsGesture.set(false);
				this.clearGestureTimer();

				if (payload.info === 1) {
					this.scheduleEnd();
				}
			}
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

		this.clearGestureTimer();
		this.gestureTimer = setTimeout(() => {
			if (!this.playbackStarted()) {
				this.needsGesture.set(true);
			}
		}, 2500);
	}

	resumePlayback(): void {
		const frame = this.player?.nativeElement;

		for (const func of ['playVideo', 'unMute', 'setVolume']) {
			frame?.contentWindow?.postMessage(
				JSON.stringify({ event: 'command', func, args: func === 'setVolume' ? [100] : [] }),
				'*',
			);
		}

		this.needsGesture.set(false);
	}

	skipTrack(): void {
		this.clearEndTimer();
		this.nextTrack(true);
	}

	nextTrack(force = false): void {
		if (!this.queue.length || (this.advancing && !force)) {
			return;
		}

		this.advancing = true;
		const index = this.queue.indexOf(this.currentId() ?? '');
		const next = this.queue[(index + 1) % this.queue.length];

		this.reloadKey.update((value) => value + 1);
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

	private clearGestureTimer(): void {
		if (this.gestureTimer) {
			clearTimeout(this.gestureTimer);
			this.gestureTimer = null;
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
