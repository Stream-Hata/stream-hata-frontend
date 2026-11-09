import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ObsService, StreamService } from './stream.services';

export interface AutoSceneMapping {
	game: string;
	scene: string;
}

interface StoredAutoScene {
	enabled: boolean;
	mappings: AutoSceneMapping[];
}

const STORAGE_KEY = 'nsh.obs-auto-scenes';

@Injectable({ providedIn: 'root' })
export class ObsAutoSceneService {
	private readonly stream = inject(StreamService);
	private readonly obs = inject(ObsService);
	private readonly invoke = (
		window as unknown as { __TAURI_INTERNALS__?: { invoke?: unknown } }
	).__TAURI_INTERNALS__;
	readonly enabled = signal(false);
	readonly mappings = signal<AutoSceneMapping[]>([]);
	private lastGame = '';
	private busy = false;

	constructor() {
		this.restore();
		if (!this.invoke) {
			return;
		}
		setInterval(() => void this.tick(), 30_000);
		void this.tick();
	}

	toggle(enabled: boolean): void {
		this.enabled.set(enabled);
		this.persist();
	}

	add(game: string, scene: string): void {
		const normalized = game.trim();
		const target = scene.trim();

		if (!normalized || !target) {
			return;
		}
		this.mappings.update((items) => [
			...items.filter((item) => item.game.toLowerCase() !== normalized.toLowerCase()),
			{ game: normalized, scene: target },
		]);
		this.persist();
	}

	remove(game: string): void {
		this.mappings.update((items) => items.filter((item) => item.game !== game));
		this.persist();
	}

	private async tick(): Promise<void> {
		if (!this.enabled() || this.busy) {
			return;
		}
		this.busy = true;
		try {
			const info = await firstValueFrom(this.stream.info());
			const game = (info.gameName ?? '').trim();

			if (!game) {
				this.lastGame = '';
				return;
			}
			if (game.toLowerCase() === this.lastGame.toLowerCase()) {
				return;
			}
			this.lastGame = game;
			const normalized = game.toLowerCase();
			const match = this.mappings().find(
				(item) =>
					normalized === item.game.toLowerCase() ||
					normalized.includes(item.game.toLowerCase()),
			);

			if (match) {
				await firstValueFrom(this.obs.scene(match.scene));
			}
		} catch {
			// OBS or Twitch unavailable
		} finally {
			this.busy = false;
		}
	}

	private restore(): void {
		try {
			const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<StoredAutoScene>;
			this.enabled.set(Boolean(parsed.enabled));
			this.mappings.set(Array.isArray(parsed.mappings) ? parsed.mappings : []);
		} catch {
			// storage unavailable
		}
	}

	private persist(): void {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ enabled: this.enabled(), mappings: this.mappings() }),
			);
		} catch {
			// storage unavailable
		}
	}
}
