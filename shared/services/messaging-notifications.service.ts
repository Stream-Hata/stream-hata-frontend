import type { IncomingMessage } from '@shared/types/messaging';
import { computed, inject, Injectable, signal } from '@angular/core';
import { buildMessageNotification, decryptMessage } from '@shared/crypto/secure-messaging';
import { MessagingIdentityService } from './messaging-identity.service';
import { MessagingService } from './messaging.service';
import { NotificationCenterService } from './notification-center.service';
import { QuietHoursService } from './quiet-hours.service';

export interface IncomingNotice {
	id: number;
	author: string;
	avatar: string;
	text: string;
}

@Injectable({ providedIn: 'root' })
export class MessagingNotificationsService {
	private readonly messaging = inject(MessagingService);
	private readonly identity = inject(MessagingIdentityService);
	private readonly center = inject(NotificationCenterService);
	private readonly quietHours = inject(QuietHoursService);
	private readonly invoke = (
		window as unknown as { __TAURI_INTERNALS__?: { invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown> } }
	).__TAURI_INTERNALS__?.invoke;
	private readonly seen = new Set<number>();
	readonly notices = signal<IncomingNotice[]>([]);
	readonly unreadCount = signal(0);
	readonly count = computed(() => this.notices().length);
	private busy = false;

	constructor() {
		if (!this.invoke) {
			return;
		}
		void this.poll();
		setInterval(() => void this.poll(), 10_000);
	}

	dismiss(id: number): void {
		this.notices.update((items) => items.filter((item) => item.id !== id));
	}

	private async poll(): Promise<void> {
		if (this.busy) {
			return;
		}
		this.busy = true;
		this.messaging.unread().subscribe({
			next: (response) => {
				this.unreadCount.set(response.count ?? 0);
				void this.handle(response.items ?? []);
			},
			error: () => undefined,
			complete: () => {
				this.busy = false;
			},
		});
	}

	private async handle(items: IncomingMessage[]): Promise<void> {
		const identity = await this.identity.ensure();
		if (!identity) {
			return;
		}
		const fresh = items.filter((item) => !this.seen.has(item.id));
		const ids: number[] = [];

		for (const item of fresh) {
			this.seen.add(item.id);
			try {
				const text = await decryptMessage(identity, {
					algorithm: 'ECDH-P256+ECDSA-P256',
					keyId: item.keyId,
					encryptionKey: item.encryptionKey,
					signingKey: item.signingKey,
				}, item.envelope);
				const notification = buildMessageNotification(item.displayName || item.sender, text);

				this.notices.update((notices) => [
					...notices.slice(-4),
					{ id: item.id, author: item.displayName || item.sender, avatar: item.avatar, text: notification.body },
				]);
				this.center.add(`Сообщение от ${notification.title.replace('Сообщение от ', '')}`, notification.body, 'message');
				if (document.hasFocus()) {
					setTimeout(() => this.dismiss(item.id), 8000);
				} else if (!this.quietHours.isQuiet()) {
					void this.invoke?.('system_alert', {
						title: notification.title,
						body: notification.body,
					});
				}
				ids.push(item.id);
			} catch {
				// leave the message unread if it cannot be decrypted
			}
		}
		void ids;
	}
}
