import type { SecurityAlert } from './security.service';
import { HttpClient } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, filter, of, switchMap, take, timer } from 'rxjs';
import { NotificationCenterService } from './notification-center.service';
import { RoleService } from './role.service';

@Injectable({ providedIn: 'root' })
export class SecurityNotificationsService {
	private readonly http = inject(HttpClient);
	private readonly center = inject(NotificationCenterService);
	private readonly roles = inject(RoleService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly seen = new Set<number>();

	constructor() {
		toObservable(this.roles.canViewSecurity)
			.pipe(
				filter(Boolean),
				take(1),
				switchMap(() => timer(0, 20_000)),
				switchMap(() =>
					this.http
						.get<{ alerts: SecurityAlert[] }>('rgg-sync/security/alerts')
						.pipe(catchError(() => of({ alerts: [] as SecurityAlert[] }))),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(({ alerts }) => this.handleAlerts(alerts));
	}

	requestPermission(): void {
		if (typeof Notification === 'undefined') {
			return;
		}
		if (Notification.permission === 'default') {
			void Notification.requestPermission();
		}
	}

	private handleAlerts(alerts: SecurityAlert[]): void {
		for (const alert of alerts) {
			if (this.seen.has(alert.id)) {
				continue;
			}
			this.seen.add(alert.id);
			const title = `Инцидент безопасности #${alert.incidentId}`;
			this.center.add(title, 'Откройте раздел «Безопасность» и проверьте файл.', 'security');
			this.systemNotification(title);
		}
	}

	private systemNotification(title: string): void {
		if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
			return;
		}
		try {
			const notification = new Notification(title, {
				body: 'Опасный файл или код ждёт проверки администратора.',
				tag: 'streamhata-security',
			});
			notification.onclick = () => window.focus();
		} catch {
			// browser notification unavailable
		}
	}
}
