import type { MusicListResponse, Track } from '@shared/types/music';
import { Component, computed, DestroyRef, effect, ElementRef, HostListener, inject, signal, untracked, ViewChild } from '@angular/core';
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
		this.configService.watch('nowplaying').pipe(
			catchError(() => of({ config: {} as WidgetConfig })),
		),
		{ initialValue: { config: {} as WidgetConfig } },
	);
	readonly playlist = computed(() => {
		const today = new Date().toLocaleDateString('en-CA');

		return [...(this.state()?.tracks ?? [])]
			.filter((track) => new Date(track.lastAddedAt).toLocaleDateString('en-CA') === today)
			.sort((left, right) => Date.parse(left.lastAddedAt) - Date.parse(right.lastAddedAt));
	});
	readonly currentId = signal<string | null>(null);
	readonly reloadKey = signal(0);
	readonly finished = signal(false);
	readonly current = computed<Track | null>(
		() => this.playlist().find((track) => track.videoId === this.currentId()) ?? null,
	);
	readonly thumbnailFailed = signal(false);
	readonly playbackStarted = signal(false);
	readonly needsGesture = signal(false);
	readonly paused = signal(true);
	readonly thumbnailUrl = computed(() => {
		const videoId = this.currentId();

		return videoId ? `rgg-sync/music/thumbnail?id=${encodeURIComponent(videoId)}` : '';
	});
	readonly showVideo = computed(() => this.config().config.showVideo !== false);
	readonly showControls = computed(() => this.config().config.showControls !== false);
	readonly videoUrl = computed<SafeResourceUrl | null>(() => {
		const videoId = this.currentId();

		if (!videoId) {
			return null;
		}

		return this.sanitizer.bypassSecurityTrustResourceUrl(
			`https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&controls=1&autohide=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=0&disablekb=1&cc_load_policy=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}&reload=${this.reloadKey()}`,
		);
	});

	constructor() {
		effect(() => {
			const playlist = this.playlist();
			const ids = playlist.map((track) => track.videoId);

			if (!ids.length) {
				this.queue = [];
				this.currentId.set(null);
				this.finished.set(false);

				return;
			}

			let added: string[] = [];

			if (!this.queue.length) {
				this.queue = [...ids];
			} else {
				const current = this.currentId();
				const existing = this.queue.filter((id) => ids.includes(id));
				added = ids.filter((id) => !this.queue.includes(id));
				const index = current ? existing.indexOf(current) : -1;

				if (added.length) {
					if (index >= 0) {
						existing.splice(index + 1, 0, ...added);
					} else {
						existing.push(...added);
					}
				}

				this.queue = existing;
			}

			if (!this.currentId() || !this.queue.includes(this.currentId() ?? '')) {
				if (!this.finished() || added.length) {
					this.finished.set(false);
					this.currentId.set(added.length ? added[added.length - 1] : this.queue[this.queue.length - 1]);
				}
			}
		});

		effect(() => {
			const videoId = this.currentId();
			this.reloadKey();
			this.music.setCurrent(videoId).subscribe({ error: () => undefined });
			this.thumbnailFailed.set(false);
			this.playbackStarted.set(false);
			this.needsGesture.set(false);
			this.clearEndTimer();
			this.clearGestureTimer();

			if (!this.currentId()) {
				return;
			}

			const duration = untracked(() => this.current()?.durationSeconds ?? 0);
			this.scheduleEnd(duration);
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
			this.applyPlayerState(typeof payload.info === 'number' ? payload.info : undefined);
		}

		if (payload?.event === 'infoDelivery') {
			this.applyPlayerState(typeof payload.info === 'object' ? payload.info.playerState : undefined);
		}

		if (payload?.event === 'onError') {
			this.nextTrack();
		}
	}

	onVideoLoad(event: Event): void {
		const frame = event.target as HTMLIFrameElement;

		this.listenToPlayer(frame);
		setTimeout(() => this.listenToPlayer(frame), 1000);
		setTimeout(() => this.listenToPlayer(frame), 3000);

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
		this.scheduleEnd();
	}

	resumePlayback(): void {
		this.sendCommand('playVideo');
		this.sendCommand('unMute');
		this.sendCommand('setVolume', [100]);
		this.paused.set(false);
		this.needsGesture.set(false);
	}

	togglePlayback(): void {
		if (this.paused()) {
			this.resumePlayback();

			return;
		}

		this.sendCommand('pauseVideo');
		this.paused.set(true);
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
		const next = index >= 0 ? this.queue[index + 1] : undefined;

		if (!next) {
			this.finished.set(true);
			this.currentId.set(null);
			this.clearEndTimer();
			setTimeout(() => {
				this.advancing = false;
			}, 1000);

			return;
		}

		this.finished.set(false);
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

	private scheduleEnd(seconds = this.current()?.durationSeconds ?? 0): void {
		this.clearEndTimer();

		this.endTimer = setTimeout(
			() => this.nextTrack(),
			Math.max(15, seconds + 10) * 1000,
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

	private applyPlayerState(value?: number | string): void {
		const state = typeof value === 'string' ? Number(value) : value;

		if (state === 0) {
			this.nextTrack();
		}

		if (state === 1 || state === 3) {
			this.playbackStarted.set(true);
			this.paused.set(state === 3);
			this.needsGesture.set(false);
			this.clearGestureTimer();

			if (state === 1) {
				this.paused.set(false);
				this.scheduleEnd();
			}
		}

		if (state === 2) {
			this.paused.set(true);
		}
	}

	private listenToPlayer(frame: HTMLIFrameElement): void {
		frame.contentWindow?.postMessage(
			JSON.stringify({ event: 'listening', id: 'nowplaying-player', channel: 'widget' }),
			'*',
		);
	}

	private sendCommand(func: string, args: unknown[] = []): void {
		this.player?.nativeElement.contentWindow?.postMessage(
			JSON.stringify({ event: 'command', func, args }),
			'*',
		);
	}

	private parseMessage(data: unknown): { event?: string; info?: number | { playerState?: number } } | null {
		if (typeof data === 'object' && data !== null) {
			return data as { event?: string; info?: number | { playerState?: number } };
		}

		if (typeof data !== 'string') {
			return null;
		}

		try {
			return JSON.parse(data) as { event?: string; info?: number | { playerState?: number } };
		} catch {
			return null;
		}
	}
}
