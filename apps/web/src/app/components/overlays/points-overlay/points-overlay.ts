import type { PointsState } from '@shared/types/automation';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { PointsService } from '@shared/services/engagement.services';
import { catchError, of, switchMap, timer } from 'rxjs';

@Component({
	selector: 'app-points-overlay',
	styleUrl: './points-overlay.scss',
	templateUrl: './points-overlay.html',
})
export class PointsOverlay {
	private readonly points = inject(PointsService);

	readonly state = toSignal(
		timer(0, 10000).pipe(
			switchMap(() =>
				this.points.getState().pipe(catchError(() => of(null as PointsState | null))),
			),
		),
		{ initialValue: null as PointsState | null },
	);

	readonly rows = computed(() => (this.state()?.top ?? []).slice(0, 5));
}
