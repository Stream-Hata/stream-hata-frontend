import type { MediaAttachment } from '@shared/messaging/message-content';

export function isMediaFile(file: File): boolean {
	if (/^(?:image|audio|video)\//i.test(file.type)) {
		return true;
	}

	return /\.(?:avif|bmp|gif|jpe?g|png|svg|webp|aac|flac|m4a|mp3|oga|ogg|opus|wav|m3u8|m4v|mkv|mov|mp4|ogv|webm)$/i.test(
		file.name,
	);
}

export function fileNameFromUrl(url: string): string {
	try {
		const parts = new URL(url, location.origin).pathname.split('/');

		return decodeURIComponent(parts[parts.length - 1] || 'Файл');
	} catch {
		return 'Файл';
	}
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} Б`;
	}
	if (bytes < 1024 * 1024) {
		return `${Math.round(bytes / 1024)} КБ`;
	}

	return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function formatTime(value: string): string {
	const date = new Date(value);

	return Number.isNaN(date.getTime())
		? '—'
		: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function linkWarningTitle(verdict: string): string {
	if (verdict === 'malicious') return 'Опасная ссылка';
	if (verdict === 'download') return 'Ссылка на файл';

	return 'Ссылка требует осторожности';
}

export function graphNodeColor(label: string): string {
	if (label === 'Друг') return '#39ff88';
	if (label === 'Незнакомец') return '#5a4a6d';

	return '#ff2ea6';
}

export function strengthWidth(value: number): number {
	return Math.min(100, value * 10);
}

export function strokeWidth(value: number): number {
	return 1 + Math.min(5, value / 2);
}

export function mediaKind(media: MediaAttachment): string {
	return media.kind;
}
