import type { AlertsState } from '@shared/types/automation';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AlertsService } from '@shared/services/alerts.service';
import { catchError, of, switchMap, timer } from 'rxjs';

@Component({
	selector: 'app-events-overlay',
	styleUrl: './events-overlay.scss',
	templateUrl: './events-overlay.html',
})
export class EventsOverlay {
	private readonly service = inject(AlertsService);

	readonly state = toSignal(
		timer(0, 3000).pipe(
			switchMap(() =>
				this.service.getState().pipe(catchError(() => of(null as AlertsState | null))),
			),
		),
		{ initialValue: null as AlertsState | null },
	);

	readonly events = computed(() => (this.state()?.events ?? []).slice(0, 5));
}
