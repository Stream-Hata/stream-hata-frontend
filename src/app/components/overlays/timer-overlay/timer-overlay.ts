import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { WidgetConfigService } from '@shared/services/widgets.service';
import { catchError, of, switchMap, timer } from 'rxjs';

interface OverlayTimerState {
	mode: string;
	timerState: {
		mode: string;
		time: { hours: number; minutes: number; seconds: number };
	};
}

const pad = (value: number) => String(value).padStart(2, '0');

@Component({
	selector: 'app-timer-overlay',
	styleUrl: './timer-overlay.scss',
	templateUrl: './timer-overlay.html',
})
export class TimerOverlay {
	private readonly http = inject(HttpClient);
	private readonly widgetConfig = inject(WidgetConfigService);
	private readonly now = signal(Date.now());
	private readonly syncedAt = signal(Date.now());
	private lastBase = '';

	readonly state = toSignal(
		timer(0, 1000).pipe(
			switchMap(() =>
				this.http
					.get<OverlayTimerState>('rgg-sync')
					.pipe(catchError(() => of(null as OverlayTimerState | null))),
			),
		),
		{ initialValue: null as OverlayTimerState | null },
	);

	readonly config = computed(() => this.widgetConfig.configs()['timer'] ?? {});

	readonly running = computed(() => this.state()?.timerState?.mode !== 'pause');
	readonly countdown = computed(() => (this.config().timerMode ?? 'countdown') === 'countdown');
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
	readonly justifyItems = computed(() =>
		this.config().timerAlign === 'right'
			? 'flex-end'
			: this.config().timerAlign === 'center'
				? 'center'
				: 'flex-start',
	);
	readonly verticalItems = computed(() =>
		this.config().timerVerticalAlign === 'top'
			? 'flex-start'
			: this.config().timerVerticalAlign === 'bottom'
				? 'flex-end'
				: 'center',
	);
	readonly textAlign = computed(() => this.config().timerAlign ?? 'left');

	readonly elapsed = computed(() => {
		const value = this.state()?.timerState?.time;
		const local = this.running()
			? Math.max(0, Math.floor((this.now() - this.syncedAt()) / 1000))
			: 0;

		return (value?.hours ?? 0) * 3600 +
			(value?.minutes ?? 0) * 60 +
			(value?.seconds ?? 0) +
			local;
	});
	readonly time = computed(() => {
		const total = this.countdown()
			? Math.max(0, this.duration() - this.elapsed())
			: Math.min(this.countFrom() + this.elapsed(), this.countTo() ?? Infinity);
		const hours = String(Math.floor(total / 3600)).padStart(2, '0');
		const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
		const seconds = String(total % 60).padStart(2, '0');

		return `${hours}:${minutes}:${seconds}`;
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

	constructor() {
		timer(0, 500).subscribe(() => this.now.set(Date.now()));
		timer(0, 1000)
			.pipe(
				switchMap(() =>
					this.widgetConfig
						.get('timer')
						.pipe(catchError(() => of(null))),
				),
				takeUntilDestroyed(),
			)
			.subscribe();
		effect(() => {
			const url = this.config().timerFontUrl;
			const id = 'nsh-timer-overlay-font';
			const existing = document.getElementById(id);

			if (!url) {
				existing?.remove();
			} else {
				const style = existing ?? document.createElement('style');

				style.id = id;
				style.textContent = `@font-face{font-family:'NSH Custom Timer Font';src:url('${url}');font-display:swap;}`;

				if (!existing) {
					document.head.append(style);
				}
			}
		});

		effect(() => {
			const state = this.state();
			const value = state?.timerState?.time;
			const base = `${state?.timerState?.mode}|${value?.hours}|${value?.minutes}|${value?.seconds}`;

			if (base !== this.lastBase) {
				this.lastBase = base;
				this.syncedAt.set(Date.now());
			}
		});
	}
}
