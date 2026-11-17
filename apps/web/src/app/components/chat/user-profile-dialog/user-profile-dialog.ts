import type { ModerationLogEntry } from '@shared/types/automation';
import { Component, computed, inject } from '@angular/core';
import { PollsService } from '@shared/services/engagement.services';
import { ModerationService } from '@shared/services/moderation.service';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';

export interface ChatUserProfile {
	userId: string;
	login: string;
	displayName: string;
	streak: number;
	firstSeenAt: string;
	lastSeenAt: string;
	balance: number;
	messages: number;
	lastMessage: string;
	lastMessageId: string;
	logs: ModerationLogEntry[];
}

@Component({
	imports: [TuiBadge, TuiButton, TuiIcon],
	selector: 'app-user-profile-dialog',
	styleUrl: './user-profile-dialog.scss',
	templateUrl: './user-profile-dialog.html',
})
export class UserProfileDialog {
	private readonly context = inject(POLYMORPHEUS_CONTEXT);
	private readonly moderation = inject(ModerationService);
	private readonly polls = inject(PollsService);
	readonly profile = this.context['data'] as ChatUserProfile;
	readonly banned = computed(() => this.profile.logs.some((entry) => entry.action === 'ban'));
	readonly timeoutCount = computed(
		() => this.profile.logs.filter((entry) => entry.action === 'timeout').length,
	);

	ban(): void {
		this.moderate({ action: 'ban', reason: 'решение модератора' });
	}

	timeout(): void {
		this.moderate({ action: 'timeout', seconds: 600, reason: 'решение модератора' });
	}

	deleteMessage(): void {
		if (this.profile.lastMessageId) {
			this.moderate({ action: 'delete', messageId: this.profile.lastMessageId });
		}
	}

	startBanVote(): void {
		this.polls
			.create(`Забанить ${this.profile.displayName}?`, ['Да', 'Нет'], 60)
			.subscribe(() => this.context['completeWith']());
	}

	close(): void {
		this.context['completeWith']();
	}

	private moderate(action: {
		action: 'ban' | 'timeout' | 'delete';
		seconds?: number;
		messageId?: string;
		reason?: string;
	}): void {
		this.moderation
			.action({
				...action,
				userId: this.profile.userId,
				displayName: this.profile.displayName,
			})
			.subscribe(() => this.context['completeWith']());
	}
}
