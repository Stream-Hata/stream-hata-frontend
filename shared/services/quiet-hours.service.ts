import { Injectable, signal } from '@angular/core';

interface StoredQuietHours {
	enabled: boolean;
	start: string;
	end: string;
}

const STORAGE_KEY = 'nsh.quiet-hours';

@Injectable({ providedIn: 'root' })
export class QuietHoursService {
	readonly enabled = signal(false);
	readonly start = signal('23:00');
	readonly end = signal('08:00');

	constructor() {
		try {
			const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<StoredQuietHours>;
			this.enabled.set(Boolean(stored.enabled));
			if (stored.start) this.start.set(stored.start);
			if (stored.end) this.end.set(stored.end);
		} catch {
			// storage unavailable
		}
	}

	isQuiet(date = new Date()): boolean {
		if (!this.enabled()) {
			return false;
		}
		const current = date.getHours() * 60 + date.getMinutes();
		const start = this.minutes(this.start());
		const end = this.minutes(this.end());

		return start <= end ? current >= start && current < end : current >= start || current < end;
	}

	setEnabled(enabled: boolean): void {
		this.enabled.set(enabled);
		this.persist();
	}

	setStart(value: string): void {
		this.start.set(value);
		this.persist();
	}

	setEnd(value: string): void {
		this.end.set(value);
		this.persist();
	}

	private minutes(value: string): number {
		const [hours, minutes] = value.split(':').map(Number);

		return (hours || 0) * 60 + (minutes || 0);
	}

	private persist(): void {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ enabled: this.enabled(), start: this.start(), end: this.end() }),
			);
		} catch {
			// storage unavailable
		}
	}
}
