import { Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WidgetConfigService } from '@shared/services/widgets.service';
import { catchError, of, switchMap, timer } from 'rxjs';
import { HotbarPreview } from '../../widgets/hotbar-preview/hotbar-preview';

@Component({
	imports: [HotbarPreview],
	selector: 'app-hotbar-overlay',
	styleUrl: './hotbar-overlay.scss',
	templateUrl: './hotbar-overlay.html',
})
export class HotbarOverlay {
	private readonly widgetConfig = inject(WidgetConfigService);
	private readonly destroyRef = inject(DestroyRef);
	readonly config = this.widgetConfig.configs;
	readonly hotbar = computed(() => this.config()['hotbar'] ?? {});
	readonly slots = computed(() => this.hotbar().hotbarSlots ?? []);

	constructor() {
		timer(0, 5000)
			.pipe(
				switchMap(() => this.widgetConfig.get('hotbar').pipe(catchError(() => of(null)))),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe();
	}
}
