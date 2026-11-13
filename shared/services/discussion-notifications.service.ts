import { HttpClient } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { NotificationCenterService } from './notification-center.service';

interface DiscussionNotification {
	id: number;
	messageId?: number;
	gameSlug: string;
	kind: string;
	read: boolean;
	createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class DiscussionNotificationsService {
	private readonly http = inject(HttpClient);
	private readonly center = inject(NotificationCenterService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly seen = new Set<number>();
	private busy = false;

	constructor() {
		timer(0, 20_000)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => void this.poll());
	}

	private poll(): void {
		if (this.busy) {
			return;
		}
		this.busy = true;
		this.http
			.get<{ items: DiscussionNotification[]; unread: number }>('rgg-sync/games/notifications')
			.subscribe({
				next: ({ items }) => {
					let fresh = 0;
					for (const item of items) {
						if (this.seen.has(item.id)) {
							continue;
						}
						this.seen.add(item.id);
						fresh++;
						const title = item.kind === 'like' ? 'Лайк в обсуждении' : 'Новый ответ в обсуждении';
						this.center.add(title, item.gameSlug, 'discussion');
					}
					if (fresh > 0) {
						this.http.post('rgg-sync/games/notifications', {}).subscribe({ error: () => undefined });
					}
				},
				complete: () => {
					this.busy = false;
				},
				error: () => {
					this.busy = false;
				},
			});
	}
}
