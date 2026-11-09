import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ObsService } from './stream.services';
import { TwitchService } from './twitch.service';

@Injectable({ providedIn: 'root' })
export class DesktopHotkeysService {
	private readonly obs = inject(ObsService);
	private readonly twitch = inject(TwitchService);
	private started = false;

	start(): void {
		if (this.started) {
			return;
		}
		this.started = true;
		document.addEventListener('keydown', (event) => {
			if (!event.ctrlKey || !event.altKey || event.repeat) {
				return;
			}
			const key = event.key.toLowerCase();
			if (key === 'c') {
				event.preventDefault();
				this.clip();
			} else if (key === 'u') {
				event.preventDefault();
				void this.mute();
			} else if (key === 's') {
				event.preventDefault();
				void this.nextScene();
			}
		});
	}

	private clip(): void {
		this.twitch.createClip().subscribe({
			next: ({ editUrl }) => this.notify('Клип создан', editUrl),
			error: () => this.notify('Не удалось создать клип', 'Проверьте авторизацию Twitch.'),
		});
	}

	private async mute(): Promise<void> {
		try {
			const status = await firstValueFrom(this.obs.status());
			const input = status.inputs.find((name) => /mic|микро/i.test(name)) ?? status.inputs[0];
			if (!input) {
				return;
			}
			const result = await firstValueFrom(this.obs.mute(input));
			this.notify(result.muted ? 'Микрофон выключен' : 'Микрофон включён', input);
		} catch {
			this.notify('Не удалось переключить микрофон', 'OBS не подключён.');
		}
	}

	private async nextScene(): Promise<void> {
		try {
			const status = await firstValueFrom(this.obs.status());
			const index = status.scenes.indexOf(status.currentScene);
			const next = status.scenes[(index + 1) % status.scenes.length];
			if (!next) {
				return;
			}
			await firstValueFrom(this.obs.scene(next));
			this.notify('Сцена переключена', next);
		} catch {
			this.notify('Не удалось переключить сцену', 'OBS не подключён.');
		}
	}

	private notify(title: string, body: string): void {
		const invoke = (window as unknown as { __TAURI_INTERNALS__?: { invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown> } }).__TAURI_INTERNALS__?.invoke;
		void invoke?.('system_alert', { title, body });
	}
}
