import type { StatusIncident, StatusSnapshot } from '@shared/services/status.service';
import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { StatusService } from '@shared/services/status.service';
import { TuiButton } from '@taiga-ui/core';

@Component({
	imports: [DatePipe, TuiButton],
	selector: 'app-status-page',
	styleUrl: './status-page.scss',
	templateUrl: './status-page.html',
})
export default class StatusPage {
	private readonly service = inject(StatusService);
	private readonly destroyRef = inject(DestroyRef);

	readonly data = signal<StatusSnapshot | null>(null);
	readonly loading = signal(true);
	readonly error = signal('');

	constructor() {
		this.load();
	}

	load(): void {
		this.loading.set(true);
		this.error.set('');
		this.service
			.get()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (data) => {
					this.data.set(data);
					this.loading.set(false);
				},
				error: () => {
					this.error.set('Не удалось получить статус сервисов');
					this.loading.set(false);
				},
			});
	}

	statusLabel(status: string): string {
		return (
			{ operational: 'Работает', degraded: 'Деградация', down: 'Недоступно' }[status] ?? status
		);
	}

	incidentStatusLabel(status: string): string {
		return (
			{
				investigating: 'Расследуем',
				identified: 'Причина найдена',
				monitoring: 'Наблюдаем',
				resolved: 'Решено',
			}[status] ?? status
		);
	}

	severityLabel(severity: string): string {
		return { minor: 'Низкая', major: 'Высокая', critical: 'Критичная' }[severity] ?? severity;
	}

	incidentTitle(incident: StatusIncident): string {
		return incident.codename || incident.code;
	}
}
