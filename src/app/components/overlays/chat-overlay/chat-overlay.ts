import type { EmotesResponse, LiveChatMessage } from '@shared/types/chat';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { buildChatSegments } from '@shared/helpers/chat-emotes';
import { ChatLiveService } from '@shared/services/chat-live.service';
import { catchError, map, of, switchMap, timer } from 'rxjs';

@Component({
	selector: 'app-chat-overlay',
	styleUrl: './chat-overlay.scss',
	templateUrl: './chat-overlay.html',
})
export class ChatOverlay {
	private readonly service = inject(ChatLiveService);

	private readonly messages = toSignal(
		timer(0, 2000).pipe(
			switchMap(() =>
				this.service.recent(12).pipe(
					map((response) => response.messages),
					catchError(() => of([] as LiveChatMessage[])),
				),
			),
		),
		{ initialValue: [] as LiveChatMessage[] },
	);

	private readonly emotes = toSignal(
		timer(0, 60000).pipe(switchMap(() => this.service.emotes().pipe(catchError(() => of(null))))),
		{ initialValue: null as EmotesResponse | null },
	);

	readonly rows = computed(() =>
		this.messages().map((message) => ({
			id: message.message_id,
			author: message.author.display_name || message.author.login,
			color: message.author.id === message.broadcaster.id,
			segments: buildChatSegments(
				message,
				this.emotes()?.sevenTV.emotes ?? {},
				this.emotes()?.twitchTemplate ??
				'https://static-cdn.jtvnw.net/emoticons/v2/%s/default/dark/2.0',
			),
		})),
	);
}
