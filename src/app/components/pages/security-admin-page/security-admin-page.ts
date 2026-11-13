import type {
	SecurityAlert,
	SecurityHashRule,
	SecurityIncident,
	SecurityIncidentStatus,
	SecurityResolveAction,
	SecurityVerdict,
} from '@shared/services/security.service';
import { DatePipe, JsonPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SecurityNotificationsService } from '@shared/services/security-notifications.service';
import { SecurityService } from '@shared/services/security.service';
import { TuiButton } from '@taiga-ui/core';
import { catchError, forkJoin, map, of, switchMap, timer } from 'rxjs';

type Filter = 'all' | 'pending_review' | 'acknowledged' | 'auto_banned' | 'resolved';

@Component({
	imports: [DatePipe, JsonPipe, TuiButton],
	selector: 'app-security-admin-page',
	styleUrl: './security-admin-page.scss',
	templateUrl: './security-admin-page.html',
})
export default class SecurityAdminPage {
	readonly incidents = signal<SecurityIncident[]>([]);
	readonly alerts = signal(0);
	readonly loading = signal(true);
	readonly error = signal('');
	readonly busy = signal<number | null>(null);
	readonly filter = signal<Filter>('all');
	readonly filters: ReadonlyArray<{ value: Filter; label: string }> = [
		{ value: 'all', label: 'Все' },
		{ value: 'pending_review', label: 'Новые' },
		{ value: 'acknowledged', label: 'В работе' },
		{ value: 'auto_banned', label: 'Автобан' },
		{ value: 'resolved', label: 'Решённые' },
	];

	readonly notes = signal<Record<number, string>>({});
	readonly hashRules = signal<SecurityHashRule[]>([]);
	readonly hashValue = signal('');
	readonly hashVerdict = signal<'malicious' | 'trusted'>('malicious');
	readonly hashReason = signal('');
	readonly hashBusy = signal(false);
	readonly hashError = signal('');
	readonly bulkHashBusy = signal(false);
	readonly bulkHashMessage = signal('');

	readonly securityNotifications = inject(SecurityNotificationsService);
	private readonly security = inject(SecurityService);
	private readonly destroyRef = inject(DestroyRef);

	readonly filtered = computed(() => {
		const filter = this.filter();

		if (filter === 'all') {
			return this.incidents();
		}

		if (filter === 'resolved') {
			return this.incidents().filter((item) =>
				['confirmed_fraud', 'false_positive', 'closed'].includes(item.status),
			);
		}

		return this.incidents().filter((item) => item.status === filter);
	});

	readonly stats = computed(() => {
		const items = this.incidents();

		return {
			total: items.length,
			pending: items.filter((item) => item.status === 'pending_review').length,
			critical: items.filter((item) => item.severity === 'critical').length,
			banned: items.filter((item) => item.status === 'auto_banned' || item.banApplied).length,
		};
	});

	constructor() {
		this.loadHashRules();
		timer(0, 20_000)
			.pipe(
				switchMap(() => this.fetch()),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((response) => this.apply(response));
	}

	load(silent = false): void {
		if (!silent) {
			this.loading.set(true);
		}
		this.fetch()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((response) => this.apply(response));
	}

	private fetch() {
		return forkJoin([this.security.incidents(), this.security.alerts()]).pipe(
			map(([incidents, alerts]) => ({ incidents: incidents.incidents, alerts: alerts.alerts })),
			catchError(() => of(null)),
		);
	}

	private apply(response: { incidents: SecurityIncident[]; alerts: SecurityAlert[] } | null): void {
		if (response) {
			this.incidents.set(response.incidents);
			this.alerts.set(response.alerts.length);
			this.error.set('');
		} else {
			this.error.set('Не удалось загрузить инциденты безопасности.');
		}
		this.loading.set(false);
	}

	setHashVerdict(value: string): void {
		this.hashVerdict.set(value === 'trusted' ? 'trusted' : 'malicious');
	}

	loadHashRules(): void {
		this.security.hashRules()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ items }) => this.hashRules.set(items),
				error: () => this.hashError.set('Не удалось загрузить правила хэшей.'),
			});
	}

	addHashRule(): void {
		const sha256 = this.hashValue().trim().toLowerCase();
		if (!/^[a-f0-9]{64}$/.test(sha256)) {
			this.hashError.set('SHA-256 должен состоять из 64 hex-символов.');
			return;
		}
		this.hashBusy.set(true);
		this.hashError.set('');
		this.security.addHashRule({ sha256, verdict: this.hashVerdict(), reason: this.hashReason().trim() })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.hashValue.set('');
					this.hashReason.set('');
					this.hashBusy.set(false);
					this.loadHashRules();
				},
				error: () => {
					this.hashBusy.set(false);
					this.hashError.set('Не удалось сохранить правило.');
				},
			});
	}

	bulkHashRules(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		input.value = '';
		if (!file || this.bulkHashBusy()) {
			return;
		}
		this.bulkHashBusy.set(true);
		this.bulkHashMessage.set('');
		this.hashError.set('');
		this.security.bulkHashRules(file, this.hashVerdict())
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					this.bulkHashBusy.set(false);
					this.bulkHashMessage.set(
						`Добавлено: ${result.added}, ошибок: ${result.failed}${
							result.errors.length ? ` · ${result.errors[0]}` : ''
						}`,
					);
					this.loadHashRules();
				},
				error: () => {
					this.bulkHashBusy.set(false);
					this.hashError.set('Не удалось загрузить список хэшей.');
				},
			});
	}

	deleteHashRule(id: number): void {
		this.security.deleteHashRule(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => this.loadHashRules(),
				error: () => this.hashError.set('Не удалось удалить правило.'),
			});
	}

	setFilter(filter: Filter): void {
		this.filter.set(filter);
	}

	setNote(id: number, event: Event): void {
		const value = (event.target as HTMLTextAreaElement).value;
		this.notes.update((notes) => ({ ...notes, [id]: value }));
	}

	acknowledge(incident: SecurityIncident): void {
		this.action(incident, () => this.security.acknowledge(incident.id));
	}

	resolve(incident: SecurityIncident, action: SecurityResolveAction): void {
		this.action(incident, () =>
			this.security.resolve(incident.id, action, this.notes()[incident.id] ?? ''));
	}

	private action(
		incident: SecurityIncident,
		request: () => ReturnType<SecurityService['acknowledge']>,
	): void {
		if (this.busy() !== null) {
			return;
		}
		this.busy.set(incident.id);
		this.error.set('');
		request()
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((updated) => {
				this.busy.set(null);
				if (!updated) {
					this.error.set('Действие не выполнено. Проверьте права и повторите.');
					return;
				}
				this.incidents.update((items) =>
					items.map((item) => (item.id === updated.id ? updated : item)),
				);
			});
	}

	statusLabel(status: SecurityIncidentStatus): string {
		switch (status) {
			case 'pending_review':
				return 'Ждёт проверки';
			case 'acknowledged':
				return 'В работе';
			case 'confirmed_fraud':
				return 'Мошенничество подтверждено';
			case 'false_positive':
				return 'Ложное срабатывание';
			case 'auto_banned':
				return 'Автобан';
			case 'closed':
				return 'Закрыт';
		}
	}

	verdictLabel(verdict: SecurityVerdict): string {
		switch (verdict) {
			case 'infected':
				return 'Заражён';
			case 'malware':
				return 'Вредоносный файл';
			case 'tampered':
				return 'Изменён';
			case 'fake':
				return 'Подделка';
			case 'fraud':
				return 'Мошенничество';
			case 'dangerous_code':
				return 'Опасный код';
			case 'suspicious':
				return 'Подозрительно';
			case 'blocked':
				return 'Заблокирован';
		}
	}

	kindLabel(kind: SecurityIncident['kind']): string {
		switch (kind) {
			case 'file':
				return 'Файл';
			case 'code':
				return 'Код';
			case 'mod':
				return 'Мод';
			case 'modpack':
				return 'Модпак';
			case 'app':
				return 'Приложение';
			case 'update':
				return 'Обновление';
			case 'archive':
				return 'Архив';
			case 'link':
				return 'Ссылка';
		}
	}

	badgeClass(incident: SecurityIncident): string {
		if (incident.status === 'false_positive' || incident.status === 'closed') {
			return 'neutral';
		}
		return incident.severity === 'critical'
			? 'critical'
			: incident.severity === 'warning'
				? 'warning'
				: 'info';
	}

	isResolved(incident: SecurityIncident): boolean {
		return ['confirmed_fraud', 'false_positive', 'closed'].includes(incident.status);
	}

	deadline(incident: SecurityIncident): Date | null {
		if (this.isResolved(incident)) {
			return null;
		}

		const value = incident.autoBanAt ?? incident.reviewDeadline;
		const date = new Date(value);

		return Number.isNaN(date.getTime()) ? null : date;
	}
}
