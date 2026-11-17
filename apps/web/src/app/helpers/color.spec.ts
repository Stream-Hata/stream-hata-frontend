import { contrastRatio, isReadableAccent, nearestReadable, parseHex } from '@shared/helpers/color';
import { describe, expect, it } from 'vitest';

describe('color helpers', () => {
	it('parses hex colors', () => {
		expect(parseHex('#FF2EA6')).toEqual({ r: 255, g: 46, b: 166 });
		expect(parseHex('nope')).toBeNull();
	});

	it('computes contrast', () => {
		expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 0);
		expect(contrastRatio('#0F0817', '#0F0817')).toBeCloseTo(1, 5);
	});

	it('rejects unreadable accents', () => {
		expect(isReadableAccent('#000000')).toBe(false);
		expect(isReadableAccent('#FF2EA6')).toBe(true);
	});

	it('finds a readable nearest accent', () => {
		const fixed = nearestReadable('#000000');

		expect(fixed).not.toBeNull();
		expect(isReadableAccent(fixed ?? '')).toBe(true);
	});
});
