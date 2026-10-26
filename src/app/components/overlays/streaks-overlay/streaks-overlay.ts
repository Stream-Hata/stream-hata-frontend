import type { ViewerWatchStreakEvent } from '@shared/types/viewer';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TwitchService } from '@shared/services/twitch.service';
import { WidgetConfigService, type WidgetConfig } from '@shared/services/widgets.service';
import { catchError, of, switchMap, timer } from 'rxjs';

@Component({
	selector: 'app-streaks-overlay',
	styleUrl: './streaks-overlay.scss',
	templateUrl: './streaks-overlay.html',
})
export class StreaksOverlay {
	private readonly twitch = inject(TwitchService);
	private readonly widgetConfig = inject(WidgetConfigService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly tick = signal(Date.now());
	private readonly shownUntil = signal(0);
	private lastKey = '';

	readonly latest = toSignal(
		timer(0, 3000).pipe(
			switchMap(() =>
				this.twitch.getLatestStreak().pipe(catchError(() => of(null as ViewerWatchStreakEvent | null))),
			),
		),
		{ initialValue: null as ViewerWatchStreakEvent | null },
	);

	readonly active = signal<ViewerWatchStreakEvent | null>(null);
	readonly visible = computed(() => this.tick() < this.shownUntil() && this.active());
	readonly config = signal<WidgetConfig>({});
	readonly milestone = computed(() => {
		const streak = this.active()?.streakCount ?? 0;
		const minimum = this.config().streakMin ?? 2;
		const every = this.config().streakEvery ?? 5;

		return streak >= minimum && (every <= 1 || streak % every === 0);
	});

	constructor() {
		this.widgetConfig
			.get('streaks')
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((response) => this.config.set(response.config));

		timer(0, 500)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.tick.set(Date.now()));

		effect(() => {
			const event = this.latest();

			if (!event) {
				return;
			}

			const key = `${event.userId}:${event.streakCount}`;
			const minimum = this.config().streakMin ?? 2;
			const every = this.config().streakEvery ?? 5;

			if (key === this.lastKey) {
				return;
			}

			if (event.streakCount < minimum || (every > 1 && event.streakCount % every !== 0)) {
				return;
			}

			this.lastKey = key;
			this.active.set(event);
			this.shownUntil.set(Date.now() + (this.config().durationSeconds ?? 10) * 1000);
		});
	}
}
