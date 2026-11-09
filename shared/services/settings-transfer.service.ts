import { Injectable } from '@angular/core';

const PREFIX = 'nsh.';
const EXCLUDED = new Set([
	'nsh.suggestion-notified',
	'nsh.system-warning-seen',
	'nsh.virus-mode',
]);

@Injectable({ providedIn: 'root' })
export class SettingsTransferService {
	export(): void {
		const data: Record<string, string> = {};

		for (let index = 0; index < localStorage.length; index += 1) {
			const key = localStorage.key(index);
			if (key?.startsWith(PREFIX) && !EXCLUDED.has(key)) {
				const value = localStorage.getItem(key);
				if (value != null) {
					data[key] = value;
				}
			}
		}
		const payload = {
			app: ' StreamHata'.trim(),
			version: 1,
			exportedAt: new Date().toISOString(),
			data,
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `streamhata-settings-${new Date().toISOString().slice(0, 10)}.json`;
		link.click();
		URL.revokeObjectURL(url);
	}

	async import(file: File): Promise<void> {
		const parsed = JSON.parse(await file.text()) as { app?: string; data?: Record<string, unknown> };

		if (!parsed.data || typeof parsed.data !== 'object') {
			throw new Error('Некорректный файл настроек');
		}
		for (const [key, value] of Object.entries(parsed.data)) {
			if (key.startsWith(PREFIX) && !EXCLUDED.has(key) && typeof value === 'string') {
				localStorage.setItem(key, value);
			}
		}
		window.location.reload();
	}
}
