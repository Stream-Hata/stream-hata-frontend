export interface Rgb {
	r: number;
	g: number;
	b: number;
}

export function parseHex(value: string): Rgb | null {
	const hex = value.trim().replace(/^#/, '');

	if (!/^[0-9a-f]{6}$/i.test(hex)) {
		return null;
	}

	return {
		r: Number.parseInt(hex.slice(0, 2), 16),
		g: Number.parseInt(hex.slice(2, 4), 16),
		b: Number.parseInt(hex.slice(4, 6), 16),
	};
}

export function toHex({ r, g, b }: Rgb): string {
	const clamp = (value: number): number => Math.min(255, Math.max(0, Math.round(value)));

	return `#${[r, g, b].map((value) => clamp(value).toString(16).padStart(2, '0')).join('')}`;
}

function channelLuminance(value: number): number {
	const channel = value / 255;

	return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function luminance(color: string): number {
	const rgb = parseHex(color);

	if (!rgb) {
		return 0;
	}

	return (
		0.2126 * channelLuminance(rgb.r) +
		0.7152 * channelLuminance(rgb.g) +
		0.0722 * channelLuminance(rgb.b)
	);
}

export function contrastRatio(first: string, second: string): number {
	const a = luminance(first);
	const b = luminance(second);

	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function mix(color: string, target: string, amount: number): string {
	const a = parseHex(color);
	const b = parseHex(target);

	if (!a || !b) {
		return color;
	}

	return toHex({
		r: a.r + (b.r - a.r) * amount,
		g: a.g + (b.g - a.g) * amount,
		b: a.b + (b.b - a.b) * amount,
	});
}

export function isReadableAccent(color: string, background = '#0F0817'): boolean {
	return parseHex(color) !== null && contrastRatio(color, background) >= 4.5;
}

export function nearestReadable(color: string, background = '#0F0817'): string | null {
	if (isReadableAccent(color, background)) {
		return color;
	}

	const rgb = parseHex(color);

	if (!rgb) {
		return null;
	}

	for (let step = 0.05; step <= 1; step += 0.05) {
		const lighter = mix(color, '#FFFFFF', step);

		if (isReadableAccent(lighter, background)) {
			return lighter;
		}

		const darker = mix(color, '#000000', step);

		if (isReadableAccent(darker, background)) {
			return darker;
		}
	}

	return null;
}
