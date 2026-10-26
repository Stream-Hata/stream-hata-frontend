import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HotbarStore } from '@app/stores/hotbar.store';
import { TuiButton } from '@taiga-ui/core';
import { Subject, takeUntil, tap } from 'rxjs';
import { TimeRow } from './time-row/time-row';

@Component({
	imports: [TuiButton, TimeRow],
	selector: 'app-timer',
	styleUrl: './timer.scss',
	templateUrl: './timer.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Timer extends Subject<void> {
	private readonly store = inject(HotbarStore);
	private readonly destroy = inject(DestroyRef);

	readonly time = this.store.currentTime;

	readonly mode = computed(() => this.store.state()?.timerState.mode);
	readonly icon = computed(() => {
		return `@tui.${this.mode() === 'pause' ? 'play' : 'pause'}`;
	});

	startTimer() {
		this.store
			.start(this.time())
			.pipe(
				tap(() => this.next()),
				takeUntil(this),
				takeUntilDestroyed(this.destroy),
			)
			.subscribe();
	}

	pauseTimer() {
		this.store
			.pause(this.time())
			.pipe(
				tap(() => this.next()),
				takeUntilDestroyed(this.destroy),
			)
			.subscribe();
	}

	reset() {
		this.store
			.pause(
				this.time().set({
					minute: 0,
					second: 0,
					hour: 0,
				}),
			)
			.pipe(
				tap(() => this.next()),
				takeUntilDestroyed(this.destroy),
			)
			.subscribe();
	}
}
