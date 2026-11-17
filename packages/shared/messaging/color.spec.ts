import { describe, expect, it } from 'vitest';
import { parseMessageContent } from './message-content';

describe('colored message spans', () => {
	it('parses color markup', () => {
		const parsed = parseMessageContent('привет {color:#ff2ea6}мир{/color}!');

		expect(parsed.spans).toEqual([
			{ kind: 'text', text: 'привет ' },
			{ kind: 'color', color: '#ff2ea6', text: 'мир' },
			{ kind: 'text', text: '!' },
		]);
	});
});
