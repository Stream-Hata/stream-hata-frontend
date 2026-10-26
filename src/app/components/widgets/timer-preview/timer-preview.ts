import { Component, computed, DestroyRef, effect, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HotbarStore } from '@app/stores/hotbar.store';
import { WidgetConfigService } from '@shared/services/widgets.service';
import { catchError, of, switchMap, timer } from 'rxjs';

const pad = (value: number) => String(value).padStart(2, '0');

@Component({
	selector: 'app-timer-preview',
	styleUrl: './timer-preview.scss',
	templateUrl: './timer-preview.html',
})
export class TimerPreview {
	private readonly store = inject(HotbarStore, { optional: true });
	private readonly widgetConfig = inject(WidgetConfigService);
	private readonly destroyRef = inject(DestroyRef);
	readonly style = input<'minimal' | 'labelled'>('labelled');

	constructor() {
		effect(() => {
			const url = this.config().timerFontUrl;
			const id = 'nsh-timer-preview-font';
			const existing = document.getElementById(id);

			if (!url) {
				existing?.remove();

				return;
			}

			const style = existing ?? document.createElement('style');

			style.id = id;
			style.textContent = `@font-face{font-family:'NSH Custom Timer Font';src:url('${url}');font-display:swap;}`;

			if (!existing) {
				document.head.append(style);
			}
		});

		timer(0, 1000)
			.pipe(
				switchMap(() =>
					this.widgetConfig
						.get('timer')
						.pipe(catchError(() => of(null))),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe();
	}
	readonly showMode = input(false);
	readonly showModeLabel = input(false);
	readonly config = computed(() => this.widgetConfig.configs()['timer'] ?? {});
	readonly countdown = computed(() => (this.config().timerMode ?? 'countdown') === 'countdown');
	readonly modeLabel = computed(() => (this.countdown() ? 'Countdown' : 'Count up'));
	readonly duration = computed(() => this.config().timerDurationSeconds ?? 754);
	readonly countFrom = computed(() => this.config().timerCountFromSeconds ?? 0);
	readonly countTo = computed(() => this.config().timerCountToSeconds ?? null);
	readonly size = computed(() => this.config().timerSize ?? 'large');
	readonly label = computed(
		() => this.config().timerLabel ?? (this.countdown() ? 'До старта события' : 'Прошло времени'),
	);
	readonly showLabel = computed(() => this.config().timerShowLabel !== false);
	readonly showProgress = computed(
		() => this.config().timerShowProgress ?? this.countdown(),
	);
	readonly progressColor = computed(() => this.config().timerProgressColor ?? '#22e0ff');
	readonly fontFamily = computed(() =>
		this.config().timerFontUrl ? 'NSH Custom Timer Font' : this.config().timerFontFamily ?? 'JetBrains Mono',
	);
	readonly textColor = computed(() => this.config().textColor ?? '#F5EAFF');
	readonly alignItems = computed(() =>
		this.config().timerAlign === 'right'
			? 'flex-end'
			: this.config().timerAlign === 'center'
				? 'center'
				: 'flex-start',
	);
	readonly textAlign = computed(() => this.config().timerAlign ?? 'left');
	readonly running = computed(
		() => !this.showMode() || this.store?.state()?.timerState.mode !== 'pause',
	);
	readonly elapsed = computed(() => {
		const value = this.store?.state()?.timerState.time;

		return (value?.hours ?? 0) * 3600 + (value?.minutes ?? 0) * 60 + (value?.seconds ?? 0);
	});
	readonly time = computed(() => {
		const total = this.countdown()
			? Math.max(0, this.duration() - this.elapsed())
			: Math.min(this.countFrom() + this.elapsed(), this.countTo() ?? Infinity);

		return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
			.map(pad)
			.join(':');
	});
	readonly progress = computed(() => {
		if (!this.countdown()) {
			const from = this.countFrom();
			const limit = this.countTo();

			if (limit === null || limit <= from) {
				return 0;
			}

			const value = Math.min(from + this.elapsed(), limit);

			return Math.max(0, Math.min(100, ((value - from) / (limit - from)) * 100));
		}

		const duration = this.duration();

		if (duration <= 0) {
			return 0;
		}

		const value = Math.max(0, duration - this.elapsed());

		return Math.max(0, Math.min(100, (value / duration) * 100));
	});
}
