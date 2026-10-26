import type { LiveChatMessage } from '../types/chat';
import { buildChatSegments, twitchEmoteUrl } from './chat-emotes';

const TEMPLATE = 'https://static-cdn.jtvnw.net/emoticons/v2/%s/default/dark/2.0';

function message(text: string, emotes: LiveChatMessage['emotes'] = []): LiveChatMessage {
	return {
		message_id: 'm1',
		broadcaster: { id: 'channel', login: 'kira_plays', display_name: 'Kira' },
		author: { id: '1', login: 'ivan', display_name: 'Ivan' },
		text,
		sent_at: '2026-05-12T18:00:00Z',
		emotes,
	};
}

describe('buildChatSegments', () => {
	it('builds twitch emote url from template', () => {
		expect(twitchEmoteUrl('25', TEMPLATE)).toBe(
			'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/2.0',
		);
	});

	it('splits text and twitch emotes by ranges', () => {
		const segments = buildChatSegments(
			message('привет Kappa!', [
				{ id: '25', name: 'Kappa', start: 7, end: 11, provider: 'twitch' },
			]),
			{},
			TEMPLATE,
		);

		expect(segments).toEqual([
			{ type: 'text', text: 'привет ' },
			{
				type: 'emote',
				text: 'Kappa',
				url: 'https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/2.0',
				source: 'twitch',
			},
			{ type: 'text', text: '!' },
		]);
	});

	it('replaces 7tv words and keeps whitespace', () => {
		const segments = buildChatSegments(
			message('cat cat dog'),
			{ cat: 'https://cdn.7tv.app/emote/c1/2x.webp' },
			TEMPLATE,
		);

		expect(segments.map((segment) => segment.type)).toEqual([
			'emote',
			'text',
			'emote',
			'text',
			'text',
		]);

		expect(segments[0].source).toBe('7tv');
		expect(segments[2].url).toContain('cdn.7tv.app');
	});

	it('ignores overlapping and invalid emote ranges', () => {
		const segments = buildChatSegments(
			message('abc', [
				{ id: '1', name: 'abc', start: 0, end: 2, provider: 'twitch' },
				{ id: '2', name: 'x', start: 1, end: 2, provider: 'twitch' },
			]),
			{},
			TEMPLATE,
		);

		expect(segments).toHaveLength(1);
		expect(segments[0].type).toBe('emote');
	});

	it('returns plain text without emotes', () => {
		const segments = buildChatSegments(message('просто текст'), {}, TEMPLATE);

		expect(segments.length).toBeGreaterThan(0);
		expect(segments.every((segment) => segment.type === 'text')).toBe(true);
	});
});
