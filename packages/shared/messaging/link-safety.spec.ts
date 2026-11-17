import { inspectLink } from './link-safety';

describe('inspectLink', () => {
	it('blocks private addresses', () => {
		expect(inspectLink('http://127.0.0.1/admin').verdict).toBe('malicious');
		expect(inspectLink('http://192.168.1.1').verdict).toBe('malicious');
	});

	it('blocks unsafe schemes', () => {
		expect(inspectLink('javascript:alert(1)').verdict).toBe('malicious');
	});

	it('marks shorteners', () => {
		expect(inspectLink('https://bit.ly/abc').verdict).toBe('suspicious');
	});

	it('marks 4PDA as community source', () => {
		expect(inspectLink('https://4pda.to/forum/index.php').verdict).toBe('suspicious');
	});

	it('marks executable downloads', () => {
		expect(inspectLink('https://example.com/app.apk').verdict).toBe('download');
	});

	it('returns unknown for ordinary links', () => {
		expect(inspectLink('https://streamhata.rdpctd.dev/blog').verdict).toBe('unknown');
	});
});
