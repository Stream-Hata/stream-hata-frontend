import type { AnalyticsState, StreamSession } from '@shared/types/stream';
import { inject, Injectable, signal } from '@angular/core';
import { AnalyticsService } from './stream.services';
import { StreamJournalService } from './stream-journal.service';

export interface SavedStreamReport {
	id: string;
	at: string;
	session: StreamSession;
	markdown: string;
}

const STORAGE_KEY = 'nsh.stream-reports';

@Injectable({ providedIn: 'root' })
export class StreamReportService {
	private readonly analytics = inject(AnalyticsService);
	private readonly journal = inject(StreamJournalService);
	private readonly invoke = (
		window as unknown as { __TAURI_INTERNALS__?: { invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown> } }
	).__TAURI_INTERNALS__?.invoke;
	readonly reports = signal<SavedStreamReport[]>([]);
	private started = false;
	private currentID = '';
	private busy = false;

	constructor() {
		try {
			const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as SavedStreamReport[];
			this.reports.set(Array.isArray(stored) ? stored : []);
		} catch {
			// storage unavailable
		}
	}

	start(): void {
		if (this.started) {
			return;
		}
		this.started = true;
		void this.poll();
		setInterval(() => void this.poll(), 30_000);
	}

	remove(id: string): void {
		this.reports.update((reports) => reports.filter((report) => report.id !== id));
		this.persist();
	}

	private async poll(): Promise<void> {
		if (this.busy) {
			return;
		}
		this.busy = true;
		this.analytics.state().subscribe({
			next: (state) => this.handle(state),
			error: () => undefined,
			complete: () => {
				this.busy = false;
			},
		});
	}

	private handle(state: AnalyticsState): void {
		const current = state.current;
		const previous = state.history[0];

		if (current) {
			this.currentID = current.id;
			return;
		}
		if (this.currentID && previous && previous.id === this.currentID) {
			this.save(previous);
			this.currentID = '';
		}
	}

	private save(session: StreamSession): void {
		const report: SavedStreamReport = {
			id: crypto.randomUUID(),
			at: new Date().toISOString(),
			session,
			markdown: this.markdown(session),
		};
		this.reports.update((reports) => [report, ...reports].slice(0, 50));
		this.persist();
		void this.invoke?.('system_alert', {
			title: 'Стрим завершён',
			body: `Итоги: ${session.peakViewers} пик, ${session.messages} сообщений. Отчёт сохранён в журнале.`,
		});
	}

	private markdown(session: StreamSession): string {
		const started = new Date(session.startedAt);
		const ended = session.endedAt ? new Date(session.endedAt) : new Date();
		const minutes = Math.max(0, Math.round((ended.getTime() - started.getTime()) / 60000));
		const journal = this.journal.toMarkdown().split('\n').slice(2).join('\n').trim() || 'Записей нет.';

		return [
			'# Итоги стрима',
			`- Начало: ${started.toLocaleString('ru-RU')}`,
			`- Окончание: ${ended.toLocaleString('ru-RU')}`,
			`- Длительность: ${Math.floor(minutes / 60)} ч ${minutes % 60} мин`,
			`- Пик зрителей: ${session.peakViewers}`,
			`- Среднее: ${Math.round(session.avgViewers)}`,
			`- Чаттеры: ${session.chatters}`,
			`- Сообщения: ${session.messages}`,
			'',
			'## Журнал',
			journal,
		].join('\n');
	}

	private persist(): void {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.reports()));
		} catch {
			// storage unavailable
		}
	}
}
