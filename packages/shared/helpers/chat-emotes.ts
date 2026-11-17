import type { LiveChatMessage } from '../types/chat';

export interface ChatSegment {
	type: 'text' | 'emote' | 'mention';
	text: string;
	url?: string;
	source?: 'twitch' | '7tv';
}

const WHITESPACE = /^\s+$/;

export function twitchEmoteUrl(id: string, template: string): string {
	return template.replace('%s', id);
}

/**
 * Режет сообщение на сегменты: Twitch-эмоты по диапазонам (Unicode),
 * 7TV-эмоты — по совпадению слов из набора канала.
 */
export function buildChatSegments(
	message: LiveChatMessage,
	sevenTV: Record<string, string>,
	twitchTemplate: string,
): ChatSegment[] {
	const chars = [...message.text];
	const emotes = [...(message.emotes ?? [])].sort((a, b) => a.start - b.start);
	const segments: ChatSegment[] = [];

	const pushText = (text: string) => {
		if (!text) {
			return;
		}

		for (const part of text.split(/(\s+)/)) {
			if (!part) {
				continue;
			}

			if (WHITESPACE.test(part)) {
				segments.push({ type: 'text', text: part });

				continue;
			}

			const url = sevenTV[part];

			if (url) {
				segments.push({ type: 'emote', text: part, url, source: '7tv' });

				continue;
			}

			if (/^@[^\s@]+$/.test(part)) {
				segments.push({ type: 'mention', text: part });

				continue;
			}

			segments.push({ type: 'text', text: part });
		}
	};

	let cursor = 0;

	for (const emote of emotes) {
		if (emote.start < cursor || emote.end < emote.start) {
			continue;
		}

		pushText(chars.slice(cursor, emote.start).join(''));
		segments.push({
			type: 'emote',
			text: emote.name,
			url: twitchEmoteUrl(emote.id, twitchTemplate),
			source: 'twitch',
		});

		cursor = emote.end + 1;
	}

	pushText(chars.slice(cursor).join(''));

	return segments;
}
