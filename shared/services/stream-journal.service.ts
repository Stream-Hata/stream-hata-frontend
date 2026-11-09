import { Injectable, signal } from '@angular/core';

export type JournalEntryKind = 'note' | 'marker';

export interface JournalEntry {
	id: string;
	at: string;
	kind: JournalEntryKind;
	text: string;
}

const STORAGE_KEY = 'nsh.stream-journal';

@Injectable({ providedIn: 'root' })
export class StreamJournalService {
	readonly entries = signal<JournalEntry[]>([]);

	constructor() {
		try {
			const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as JournalEntry[];
			this.entries.set(Array.isArray(stored) ? stored : []);
		} catch {
			// storage unavailable
		}
		document.addEventListener('keydown', (event) => {
			if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'm') {
				event.preventDefault();
				this.add('Маркер момента', 'marker');
			}
		});
	}

	add(text: string, kind: JournalEntryKind = 'note'): void {
		const value = text.trim();
		if (!value) {
			return;
		}
		this.entries.update((entries) => [
			...entries,
			{ id: crypto.randomUUID(), at: new Date().toISOString(), kind, text: value },
		]);
		this.persist();
	}

	remove(id: string): void {
		this.entries.update((entries) => entries.filter((entry) => entry.id !== id));
		this.persist();
	}

	clear(): void {
		this.entries.set([]);
		this.persist();
	}

	toMarkdown(): string {
		const lines = this.entries()
			.slice()
			.sort((left, right) => left.at.localeCompare(right.at))
			.map((entry) => {
				const time = new Date(entry.at).toLocaleTimeString('ru-RU', {
					hour: '2-digit',
					minute: '2-digit',
				});
				const prefix = entry.kind === 'marker' ? '**МАРКЕР**' : 'Заметка';

				return `- ${time} — ${prefix}: ${entry.text}`;
			});

		return `# Журнал стрима\n\n${lines.join('\n')}`;
	}

	private persist(): void {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries()));
		} catch {
			// storage unavailable
		}
	}
}
