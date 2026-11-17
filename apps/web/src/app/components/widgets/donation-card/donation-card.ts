import type { DonationEvent, DonationWidgetConfig } from '@shared/types/donation';
import { Component, computed, input } from '@angular/core';

@Component({
	selector: 'app-donation-card',
	styleUrl: './donation-card.scss',
	templateUrl: './donation-card.html',
})
export class DonationCard {
	readonly event = input<DonationEvent | null>(null);
	readonly config = input.required<DonationWidgetConfig>();
	readonly rows = input<DonationEvent[]>([]);
	readonly preview = input(false);
	readonly layout = computed(() => this.config().layout);
	readonly style = computed(() => {
		const config = this.config();

		return {
			'--donation-width': `${config.width}px`,
			'--donation-scale': String(config.scale),
			'--donation-bg': config.background,
			'--donation-text': config.textColor,
			'--donation-accent': config.accentColor,
			'--donation-border': config.borderColor,
			'--donation-glow': config.glowColor,
			'--donation-blur': `${config.blur}px`,
			'--donation-font': config.fontFamily || 'Inter',
		};
	});

	readonly animationClass = computed(() => `donation-anim-${this.config().animation}`);
}
