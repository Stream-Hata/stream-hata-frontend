import { describe, expect, it } from 'vitest';
import { formatCode, formatFencedCode, validateCodeBlock } from './code-format';

describe('code formatting', () => {
	it('formats sql', async () => {
		const result = await formatCode('select a,b from t where x=1', 'sql');
		expect(result).toContain('SELECT');
	});

	it('formats a javascript fenced block', async () => {
		const result = await formatFencedCode('```js\nconst x={a:1}\n```');
		expect(result).toContain('const x = { a: 1 };');
	});

	it('keeps unknown languages unchanged', async () => {
		expect(await formatFencedCode('```unknown\na   b\n```')).toBe('```unknown\na   b\n```');
	});
});

describe('syntax diagnostics', () => {
	it('reports a line and column for invalid code', async () => {
		const { formatCode, describeCodeError } = await import('./code-format');
		try {
			await formatCode('const x = {', 'js');
			throw new Error('expected failure');
		} catch (error) {
			const issue = describeCodeError(error);
			expect(issue.line).toBeGreaterThan(0);
			expect(issue.column).toBeGreaterThan(0);
			expect(issue.message.length).toBeGreaterThan(0);
		}
	});
});


describe('incoming code validation', () => {
	it('reports broken brackets for a recipient', async () => {
		const issue = await validateCodeBlock('const x = {', 'js');

		expect(issue?.message.length).toBeGreaterThan(0);
	});

	it('accepts valid code', async () => {
		expect(await validateCodeBlock('const x = { a: 1 };', 'js')).toBeNull();
	});
});
