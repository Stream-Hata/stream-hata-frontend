import type { AlertEvent, AlertsState } from '@shared/types/automation';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AlertsService } from '@shared/services/alerts.service';
import { catchError, of, switchMap, timer } from 'rxjs';
import { OverlayAudioService } from '../overlay-audio.service';

const TYPE_LABELS: Record<string, string> = {
	follow: 'Новый фолловер',
	subscribe: 'Новая подписка',
	gift: 'Подарочная подписка',
	resub: 'Продление подписки',
	cheer: 'Битсы',
	raid: 'Рейд',
	hype_train: 'Хайп-трейн',
	goal: 'Цель достигнута',
	stream_online: 'Стрим начался',
	stream_offline: 'Стрим завершён',
};

@Component({
	selector: 'app-alerts-overlay',
	styleUrl: './alerts-overlay.scss',
	templateUrl: './alerts-overlay.html',
})
export class AlertsOverlay {
	private readonly service = inject(AlertsService);
	private readonly audio = inject(OverlayAudioService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly tick = signal(Date.now());
	private lastPlayedId = '';

	readonly state = toSignal(
		timer(0, 2000).pipe(
			switchMap(() =>
				this.service.getState().pipe(catchError(() => of(null as AlertsState | null))),
			),
		),
		{ initialValue: null as AlertsState | null },
	);

	readonly latest = computed<AlertEvent | null>(() => this.state()?.events?.[0] ?? null);
	readonly active = computed(() => {
		const event = this.latest();
		const settings = this.state()?.settings;

		if (!event || !settings) {
			return null;
		}

		const age = this.tick() - new Date(event.createdAt).getTime();

		if (age > settings.durationSeconds * 1000) {
			return null;
		}

		return event;
	});

	readonly typeLabel = computed(() => TYPE_LABELS[this.active()?.type ?? ''] ?? 'Событие');

	constructor() {
		timer(0, 500)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.tick.set(Date.now()));

		effect(() => {
			const settings = this.state()?.settings;
			const event = this.latest();

			if (
				!settings?.soundEnabled ||
				!settings.soundUrl ||
				!event ||
				event.id === this.lastPlayedId
			) {
				return;
			}

			this.lastPlayedId = event.id;
			this.audio.play(settings.soundUrl, settings.soundVolume);
		});
	}
}
