import { inject, Injectable } from '@angular/core';
import { MessagingService } from './messaging.service';

@Injectable({ providedIn: 'root' })
export class MessagingPresenceService {
	private readonly messaging = inject(MessagingService);
	private started = false;

	typing(peer: string) {
		return this.messaging.typing(peer);
	}

	start(): void {
		if (this.started || !(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
			return;
		}
		this.started = true;
		this.messaging.heartbeat().subscribe({ error: () => undefined });
		setInterval(() => this.messaging.heartbeat().subscribe({ error: () => undefined }), 25_000);
	}
}
