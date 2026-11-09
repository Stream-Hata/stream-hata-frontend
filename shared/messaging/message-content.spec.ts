import { describe, expect, it } from 'vitest';
import { detectCodeLanguage, detectMediaKind, parseMessageContent } from './message-content';

describe('message content', () => {
	it('parses Telegram-like formatting and mentions', () => {
		const parsed = parseMessageContent('**bold** __italic__ `code` ||spoiler|| @streamer [link](https://example.com)');

		expect(parsed.spans.map((span) => span.kind)).toEqual([
			'bold', 'text', 'italic', 'text', 'code', 'text', 'spoiler', 'text', 'mention', 'text', 'link',
		]);
	});

	it('parses fenced code blocks with language', () => {
		const parsed = parseMessageContent('before\n```ts\nconst x = 1;\nconst y = 2;\n```\nafter');

		expect(parsed.spans).toEqual([
			{ kind: 'text', text: 'before\n' },
			{ kind: 'codeblock', language: 'ts', text: 'const x = 1;\nconst y = 2;' },
			{ kind: 'text', text: '\nafter' },
		]);
	});

	it('auto-detects code language when fence has no language', () => {
		expect(detectCodeLanguage('const x = 1;\nconsole.log(x);')).toBe('js');
		expect(detectCodeLanguage('def hello():\n    print("hi")')).toBe('python');
		expect(detectCodeLanguage('package main\nfunc main() {}')).toBe('go');
		expect(detectCodeLanguage('{\"ok\":true}')).toBe('json');

		const parsed = parseMessageContent('```\nconst x = 1;\n```');
		expect(parsed.spans[0]).toMatchObject({ kind: 'codeblock', language: 'js' });
	});

	it('detects media links and ignores file uploads', () => {
		expect(detectMediaKind('https://cdn.example.com/a.png')).toBe('image');
		expect(detectMediaKind('https://cdn.example.com/a.mp3?x=1')).toBe('audio');
		expect(detectMediaKind('https://cdn.example.com/a.mp4')).toBe('video');
		expect(detectMediaKind('https://example.com/page')).toBe('link');
	});

	it('exposes media separately from text', () => {
		const parsed = parseMessageContent('look https://cdn.example.com/a.webp and https://cdn.example.com/b.mp3');
		expect(parsed.media).toEqual([
			{ kind: 'image', url: 'https://cdn.example.com/a.webp' },
			{ kind: 'audio', url: 'https://cdn.example.com/b.mp3' },
		]);
	});
});
