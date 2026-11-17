import type { WidgetConfig } from '@api/widgets.service';
import type { RouletteConfig } from '@shared/types/roulette';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { I18nService } from '@api/i18n.service';
import { RouletteService } from '@api/roulette.service';
import { WidgetConfigService, WidgetsService } from '@api/widgets.service';
import { DEFAULT_ROULETTE_CONFIG } from '@shared/types/roulette';
import { TuiButton, TuiIcon, TuiLink } from '@taiga-ui/core';
import { TuiBadge, TuiButtonCopy, TuiSwitch } from '@taiga-ui/kit';
import { Timer } from '../../hotbar/timer/timer';
import { AlertPreview } from '../../widgets/alert-preview/alert-preview';
import { HotbarPreview } from '../../widgets/hotbar-preview/hotbar-preview';
import { JuryPreview } from '../../widgets/jury-preview/jury-preview';
import { MiniWheel } from '../../widgets/mini-wheel/mini-wheel';
import { SystemStatsWidget } from '../../widgets/system-stats-widget/system-stats-widget';
import {
	loadSystemWidgetConfig,
	systemWidgetUrl,
} from '../../widgets/system-stats-widget/system-widget-config';
import { TimerPreview } from '../../widgets/timer-preview/timer-preview';

@Component({
	imports: [
		Timer,
		RouterLink,
		TuiBadge,
		TuiButton,
		TuiButtonCopy,
		TuiIcon,
		TuiLink,
		TuiSwitch,
		AlertPreview,
		HotbarPreview,
		JuryPreview,
		MiniWheel,
		SystemStatsWidget,
		TimerPreview,
	],
	selector: 'app-widgets-page',
	styleUrl: './widgets-page.scss',
	templateUrl: './widgets-page.html',
})
export default class WidgetsPage {
	readonly i18n = inject(I18nService);
	private readonly widgets = inject(WidgetsService);
	private readonly widgetConfig = inject(WidgetConfigService);
	private readonly roulette = inject(RouletteService);
	private readonly destroyRef = inject(DestroyRef);

	readonly desktop =
		navigator.userAgent.includes('NamelessStreamHataDesktop') || '__TAURI_INTERNALS__' in window;

	readonly systemEnabled = signal(true);
	readonly systemUrl = signal(systemWidgetUrl(loadSystemWidgetConfig()));
	readonly state = signal<Record<string, boolean>>({});
	readonly hotbarConfig = signal<WidgetConfig>({});
	readonly rouletteConfig = signal<RouletteConfig>(DEFAULT_ROULETTE_CONFIG);

	constructor() {
		this.initSystem();

		this.widgetConfig
			.get('hotbar')
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => this.hotbarConfig.set(response.config),
				error: () => undefined,
			});

		this.roulette
			.config()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (config) => this.rouletteConfig.set(config),
				error: () => undefined,
			});

		this.widgets
			.get()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((response) => this.state.set(response.widgets));
	}

	private initSystem(): void {
		const internals = (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] as
			{ invoke?: (command: string) => Promise<unknown> } | undefined;

		if (!internals?.invoke) {
			return;
		}

		void internals
			.invoke('system_widget_enabled')
			.then((enabled) => this.systemEnabled.set(Boolean(enabled)));
	}

	toggleSystem(enabled: boolean): void {
		this.systemEnabled.set(enabled);
		const internals = (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] as
			| { invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown> }
			| undefined;

		void internals?.invoke?.('set_system_widget_enabled', { enabled });
	}

	isEnabled(kind: string): boolean {
		return this.state()[kind] ?? false;
	}

	toggle(kind: string, enabled: boolean): void {
		this.state.update((state) => ({ ...state, [kind]: enabled }));
		this.widgets
			.set(kind, enabled)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((response) => this.state.set(response.widgets));
	}

	overlayUrl(kind: string): string {
		return `${location.origin}/overlay/${kind}`;
	}
}
