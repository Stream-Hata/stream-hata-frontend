import type { EmotesResponse, LiveChatMessage } from '@shared/types/chat';
import { Component, computed, inject } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { buildChatSegments } from '@shared/helpers/chat-emotes';
import { ChatLiveService } from '@shared/services/chat-live.service';
import { WidgetConfigService, type WidgetConfig } from '@shared/services/widgets.service';
import { catchError, map, of, scan, switchMap, timer } from 'rxjs';

const BADGE_IMAGES: Record<string, string> = {
	broadcaster: '5527c58c-fb7d-422d-b71b-f309dcb85cc1',
	moderator: '3267646d-33f0-4b17-b3df-f923a41db1d0',
	vip: 'b817aba4-fad8-49e2-b88a-7cc744dfa6ec',
	subscriber: '5d9f2208-5dd8-11e7-8513-2ff4adfae661',
	premium: 'bbbe0db0-a598-423e-86d0-f9fb98ca1933',
	partner: 'd12a2e27-16f6-41d0-ab77-b780518f00a3',
	staff: 'd97c37bd-a6f5-4c38-8f57-4e4bef88af34',
};

const BADGE_LABELS: Record<string, string> = {
	broadcaster: 'Стример',
	moderator: 'Модератор',
	vip: 'VIP',
	subscriber: 'Подписчик',
	premium: 'Prime',
	partner: 'Партнёр Twitch',
	staff: 'Сотрудник Twitch',
};

@Component({
	imports: [TuiIcon],
	selector: 'app-chat-overlay',
	styleUrl: './chat-overlay.scss',
	templateUrl: './chat-overlay.html',
})
export class ChatOverlay {
	private readonly service = inject(ChatLiveService);
	private readonly configService = inject(WidgetConfigService);
	readonly config = toSignal(
		this.configService.watch('chat').pipe(catchError(() => of({ config: {} as WidgetConfig }))),
		{ initialValue: { config: {} as WidgetConfig } },
	);
	readonly animated = computed(() => this.config().config.chatAnimation !== false);
	readonly channelMode = computed(() => this.config().config.chatChannelMode === 'original' ? 'original' : 'all');

	private readonly messages = toSignal(
		timer(0, 2000).pipe(
			switchMap(() =>
				this.service.recent(50, this.channelMode()).pipe(
					map((response) => response.messages),
					catchError(() => of(null)),
				),
			),
			scan(
				(previous, messages) => messages ?? previous,
				[] as LiveChatMessage[],
			),
		),
		{ initialValue: [] as LiveChatMessage[] },
	);

	private readonly badges = toSignal(
		timer(0, 60000).pipe(switchMap(() => this.service.badges().pipe(catchError(() => of(null))))),
		{ initialValue: null as { badges: Record<string, string> } | null },
	);

	private readonly emotes = toSignal(
		timer(0, 60000).pipe(switchMap(() => this.service.emotes().pipe(catchError(() => of(null))))),
		{ initialValue: null as EmotesResponse | null },
	);

	readonly rows = computed(() =>
		this.messages().map((message) => ({
			id: message.message_id,
			author: message.author.display_name || message.author.login,
			color: /^#[0-9a-f]{6}$/i.test(message.color?.trim() ?? '') ? message.color!.trim() : null,
			badges: message.badges ?? [],
			authorId: message.author.id,
			segments: buildChatSegments(
				message,
				this.emotes()?.sevenTV.emotes ?? {},
				this.emotes()?.twitchTemplate ??
				'https://static-cdn.jtvnw.net/emoticons/v2/%s/default/dark/2.0',
			),
		})),
	);

	badgeUrl(setId: string, version: string): string | null {
		const resolved = this.badges()?.badges[`${setId}/${version}`];

		if (resolved) {
			return resolved;
		}

		const image = BADGE_IMAGES[setId];

		return image ? `https://static-cdn.jtvnw.net/badges/v1/${image}/2` : null;
	}

	badgeIcon(setId: string): string {
		if (setId === 'broadcaster') return '@tui.crown';
		if (setId === 'moderator') return '@tui.shield';
		if (setId === 'vip') return '@tui.gem';
		if (setId.startsWith('subscriber')) return '@tui.star';
		if (setId === 'premium') return '@tui.zap';
		if (setId === 'partner') return '@tui.badge-check';
		if (setId === 'staff') return '@tui.wrench';

		return '@tui.badge';
	}

	badgeLabel(setId: string): string {
		return BADGE_LABELS[setId] ?? setId;
	}
}
