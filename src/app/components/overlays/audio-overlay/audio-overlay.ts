import type { AlertsState } from '@shared/types/automation';
import { Component, DestroyRef, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AlertsService } from '@shared/services/alerts.service';
import { catchError, of, switchMap, timer } from 'rxjs';
import { OverlayAudioService } from '../overlay-audio.service';

@Component({
	selector: 'app-audio-overlay',
	styleUrl: './audio-overlay.scss',
	templateUrl: './audio-overlay.html',
})
export class AudioOverlay {
	private readonly service = inject(AlertsService);
	private readonly audio = inject(OverlayAudioService);
	private readonly destroyRef = inject(DestroyRef);
	private lastPlayedId = '';

	readonly state = toSignal(
		timer(0, 2000).pipe(
			switchMap(() =>
				this.service.getState().pipe(catchError(() => of(null as AlertsState | null))),
			),
		),
		{ initialValue: null as AlertsState | null },
	);

	constructor() {
		effect(() => {
			const settings = this.state()?.settings;
			const event = this.state()?.events?.[0] ?? null;

			if (
				!settings?.soundEnabled ||
				!settings.soundUrl ||
				!event ||
				event.id === this.lastPlayedId
			) {
				return;
			}

			this.lastPlayedId = event.id;
			this.audio.play(settings.soundUrl, settings.soundVolume);
		});

		this.destroyRef.onDestroy(() => this.audio.stop());
	}
}
