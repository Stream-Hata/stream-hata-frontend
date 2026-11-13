import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, timer } from 'rxjs';
import { MessagingService } from './messaging.service';

@Injectable({ providedIn: 'root' })
export class MessagingPresenceService {
	private readonly messaging = inject(MessagingService);
	private readonly destroyRef = inject(DestroyRef);
	private started = false;

	typing(peer: string) {
		return this.messaging.typing(peer);
	}

	start(): void {
		if (this.started || !(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) {
			return;
		}
		this.started = true;
		timer(0, 25_000)
			.pipe(
				switchMap(() => this.messaging.heartbeat().pipe(catchError(() => of(null)))),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe();
	}
}
