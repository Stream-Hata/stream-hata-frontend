import type { OnDestroy } from '@angular/core';
import { Component, computed, DOCUMENT, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { WidgetConfigService, type WidgetConfig } from '@shared/services/widgets.service';
import { catchError, map, of, switchMap, timer } from 'rxjs';
import { AlertsOverlay } from '../alerts-overlay/alerts-overlay';
import { AudioOverlay } from '../audio-overlay/audio-overlay';
import { ChatOverlay } from '../chat-overlay/chat-overlay';
import { DiceOverlay } from '../dice-overlay/dice-overlay';
import { GameOverlay } from '../game-overlay/game-overlay';
import { DonationsOverlay } from '../donations-overlay/donations-overlay';
import { EventsOverlay } from '../events-overlay/events-overlay';
import { HotbarOverlay } from '../hotbar-overlay/hotbar-overlay';
import { JuryOverlay } from '../jury-overlay/jury-overlay';
import { MusicOverlay } from '../music-overlay/music-overlay';
import { NowPlayingOverlay } from '../nowplaying-overlay/nowplaying-overlay';
import { RouletteOverlay } from '../roulette-overlay/roulette-overlay';
import { PointsOverlay } from '../points-overlay/points-overlay';
import { QuotesOverlay } from '../quotes-overlay/quotes-overlay';
import { StreaksOverlay } from '../streaks-overlay/streaks-overlay';
import { TimerOverlay } from '../timer-overlay/timer-overlay';
import { WheelOverlay } from '../wheel-overlay/wheel-overlay';

@Component({
	imports: [
		AlertsOverlay,
		AudioOverlay,
		ChatOverlay,
		DiceOverlay,
		GameOverlay,
		DonationsOverlay,
		EventsOverlay,
		HotbarOverlay,
		JuryOverlay,
		MusicOverlay,
		NowPlayingOverlay,
		RouletteOverlay,
		PointsOverlay,
		QuotesOverlay,
		StreaksOverlay,
		TimerOverlay,
		WheelOverlay,
	],
	selector: 'app-overlay-host',
	styleUrl: './overlay-host.scss',
	templateUrl: './overlay-host.html',
})
export default class OverlayHost implements OnDestroy {
	private readonly document = inject(DOCUMENT);
	private readonly route = inject(ActivatedRoute);
	private readonly widgetConfig = inject(WidgetConfigService);
	private readonly http = inject(HttpClient);

	readonly kind = toSignal(
		this.route.paramMap.pipe(map((params) => params.get('kind') ?? 'jury')),
		{ initialValue: 'jury' },
	);

	readonly config = toSignal(
		toObservable(this.kind).pipe(
			switchMap((kind) =>
				this.widgetConfig.get(kind).pipe(
					map((response) => response.config),
					catchError(() => of({} as WidgetConfig)),
				),
			),
		),
		{ initialValue: {} as WidgetConfig },
	);

	readonly globalSettings = toSignal(
		timer(0, 5000).pipe(
			switchMap(() =>
				this.http
					.get<{ accent?: string }>('rgg-sync/app-settings', { params: { t: Date.now() } })
					.pipe(catchError(() => of<{ accent?: string }>({}))),
			),
		),
		{ initialValue: {} as { accent?: string } },
	);

	readonly surfaceStyle = computed(() => {
		const config = this.config();

		return {
			'--widget-bg': config.transparent === false
				? config.backgroundColor ?? 'rgb(18, 18, 24, 0.92)'
				: 'transparent',
			'--widget-text': config.textColor ?? '#f5eaff',
			'--widget-accent': this.globalSettings().accent ?? config.accentColor ?? '#ff2ea6',
			'--accent-primary': this.globalSettings().accent ?? config.accentColor ?? '#ff2ea6',
			'--widget-scale': String(config.scale ?? 1),
		};
	});

	constructor() {
		this.document.body.classList.add('overlay-mode');
		this.document.documentElement.classList.add('overlay-mode');
	}

	ngOnDestroy(): void {
		this.document.body.classList.remove('overlay-mode');
		this.document.documentElement.classList.remove('overlay-mode');
	}
}
