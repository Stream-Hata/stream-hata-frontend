import type { AnalyticsState, StreamSession } from '@shared/types/stream';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TuiButton, TuiIcon, TuiInput, TuiTextfield } from '@taiga-ui/core';
import { AnalyticsService } from '@shared/services/stream.services';
import { I18nService } from '@shared/services/i18n.service';
import { StreamJournalService } from '@shared/services/stream-journal.service';
import { StreamReportService, type SavedStreamReport } from '@shared/services/stream-report.service';
import { catchError, of, switchMap, timer } from 'rxjs';

@Component({
	imports: [TuiButton, TuiIcon, TuiInput, TuiTextfield],
	selector: 'app-journal-page',
	styleUrl: './journal-page.scss',
	templateUrl: './journal-page.html',
})
export default class JournalPage {
	readonly journal = inject(StreamJournalService);
	readonly i18n = inject(I18nService);
	readonly reportService = inject(StreamReportService);
	private readonly analytics = inject(AnalyticsService);
	readonly draft = signal('');
	readonly status = signal('');
	readonly state = toSignal(
		timer(0, 15000).pipe(
			switchMap(() =>
				this.analytics.state().pipe(
					catchError(() => of({ current: null, history: [], messages: 0 } as AnalyticsState)),
				),
			),
		),
		{ initialValue: { current: null, history: [], messages: 0 } as AnalyticsState },
	);
	readonly report = computed(() => {
		const state = this.state();
		const session = state.current ?? state.history[0];
		const entries = this.journal.entries();
		const lines = ['# Итоги стрима', ''];

		if (session) {
			lines.push(
				`- Начало: ${this.date(session.startedAt)}`,
				`- Окончание: ${session.endedAt ? this.date(session.endedAt) : 'в эфире'}`,
				`- Длительность: ${this.duration(session)}`,
				`- Пик зрителей: ${session.peakViewers}`,
				`- Среднее: ${Math.round(session.avgViewers)}`,
				`- Активных чаттеров: ${session.chatters}`,
				`- Сообщений: ${session.messages}`,
			);
		} else {
			lines.push('- Данных о сессии пока нет.');
		}
		lines.push('', '## Маркеры и заметки', '');
		if (entries.length) {
			lines.push(this.journal.toMarkdown().split('\n').slice(2).join('\n'));
		} else {
			lines.push('Записей нет.');
		}

		return lines.join('\n');
	});

	addNote(): void {
		this.journal.add(this.draft());
		this.draft.set('');
	}

	copyReport(): void {
		void navigator.clipboard.writeText(this.report());
		this.status.set('Отчёт скопирован.');
	}

	downloadReport(): void {
		const blob = new Blob([this.report()], { type: 'text/markdown;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `stream-report-${new Date().toISOString().slice(0, 10)}.md`;
		link.click();
		URL.revokeObjectURL(url);
		this.status.set('Отчёт сохранён.');
	}

	downloadSaved(report: SavedStreamReport): void {
		const blob = new Blob([report.markdown], { type: 'text/markdown;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `stream-report-${report.session.startedAt.slice(0, 10)}.md`;
		link.click();
		URL.revokeObjectURL(url);
	}

	time(value: string): string {
		return new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
	}

	private date(value: string): string {
		return new Date(value).toLocaleString('ru-RU');
	}

	private duration(session: StreamSession): string {
		const end = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
		const minutes = Math.max(0, Math.round((end - new Date(session.startedAt).getTime()) / 60000));
		return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
	}
}
