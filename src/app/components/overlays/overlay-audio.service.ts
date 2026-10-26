import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OverlayAudioService {
	private audio: HTMLAudioElement | null = null;

	play(url: string, volume = 70): void {
		if (!url || typeof Audio === 'undefined') {
			return;
		}

		this.audio?.pause();
		this.audio = new Audio(url);
		this.audio.volume = Math.min(100, Math.max(0, volume)) / 100;
		void this.audio.play().catch(() => undefined);
	}

	stop(): void {
		this.audio?.pause();
		this.audio = null;
	}
}
