import type { ElementRef } from '@angular/core';
import type { EmotesResponse, LiveChatMessage } from '@shared/types/chat';
import type { ChatUserProfile } from '../../chat/user-profile-dialog/user-profile-dialog';
import { Component, computed, effect, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { buildChatSegments } from '@shared/helpers/chat-emotes';
import { ChatLiveService } from '@shared/services/chat-live.service';
import { PointsService } from '@shared/services/engagement.services';
import { ModerationService } from '@shared/services/moderation.service';
import { TwitchService } from '@shared/services/twitch.service';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { catchError, firstValueFrom, map, of, switchMap, timer } from 'rxjs';
import { UserProfileDialog } from '../../chat/user-profile-dialog/user-profile-dialog';

@Component({
	imports: [TuiIcon],
	selector: 'app-chat-page',
	styleUrl: './chat-page.scss',
	templateUrl: './chat-page.html',
})
export default class ChatPage {
	private readonly service = inject(ChatLiveService);
	private readonly dialogs = inject(TuiDialogService);
	private readonly twitch = inject(TwitchService);
	private readonly points = inject(PointsService);
	private readonly moderation = inject(ModerationService);

	readonly messages = toSignal(
		timer(0, 2000).pipe(
			switchMap(() =>
				this.service.recent(100).pipe(
					map((response) => response.messages),
					catchError(() => of([] as LiveChatMessage[])),
				),
			),
		),
		{ initialValue: [] as LiveChatMessage[] },
	);

	readonly emotes = toSignal(
		timer(0, 60000).pipe(switchMap(() => this.service.emotes().pipe(catchError(() => of(null))))),
		{ initialValue: null as EmotesResponse | null },
	);

	readonly emoteCount = computed(() => Object.keys(this.emotes()?.sevenTV.emotes ?? {}).length);

	readonly emoteStrip = computed(() =>
		Object.entries(this.emotes()?.sevenTV.emotes ?? {})
			.slice(0, 48)
			.map(([name, url]) => ({ name, url })),
	);

	private readonly scroller = viewChild<ElementRef<HTMLDivElement>>('scroller');

	constructor() {
		effect(() => {
			this.messages();

			const element = this.scroller()?.nativeElement;

			if (!element) {
				return;
			}

			queueMicrotask(() => {
				element.scrollTop = element.scrollHeight;
			});
		});
	}

	segments(message: LiveChatMessage) {
		return buildChatSegments(
			message,
			this.emotes()?.sevenTV.emotes ?? {},
			this.emotes()?.twitchTemplate ??
			'https://static-cdn.jtvnw.net/emoticons/v2/%s/default/dark/2.0',
		);
	}

	async openProfile(message: LiveChatMessage): Promise<void> {
		const [viewers, points, moderation] = await Promise.all([
			firstValueFrom(this.twitch.getViewers().pipe(catchError(() => of({ total: 0, viewers: [] })))),
			firstValueFrom(this.points.getState().pipe(catchError(() => of(null)))),
			firstValueFrom(this.moderation.getState().pipe(catchError(() => of(null)))),
		]);

		const viewer = viewers.viewers.find((item) => item.userId === message.author.id);
		const wallet = points?.top.find((item) => item.userId === message.author.id);
		const authorMessages = this.messages().filter((item) => item.author.id === message.author.id);
		const lastMessage = authorMessages[authorMessages.length - 1];
		const logs = (moderation?.log ?? []).filter(
			(entry) => entry.user === (message.author.display_name || message.author.login),
		);

		const profile: ChatUserProfile = {
			userId: message.author.id,
			login: message.author.login,
			displayName: message.author.display_name || message.author.login,
			streak: viewer?.watchStreak ?? 0,
			firstSeenAt: viewer?.firstSeenAt ?? '',
			lastSeenAt: viewer?.lastSeenAt ?? '',
			balance: wallet?.balance ?? 0,
			messages: authorMessages.length,
			lastMessage: lastMessage?.text ?? '',
			lastMessageId: lastMessage?.message_id ?? '',
			logs,
		};

		this.dialogs
			.open(UserProfileDialog, { label: 'Профиль зрителя', size: 'm', data: profile })
			.subscribe();
	}

	isBroadcaster(message: LiveChatMessage): boolean {
		return message.author.id === message.broadcaster.id;
	}

	time(value: string): string {
		const date = new Date(value);

		return Number.isNaN(date.getTime())
			? ''
			: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
	}
}
