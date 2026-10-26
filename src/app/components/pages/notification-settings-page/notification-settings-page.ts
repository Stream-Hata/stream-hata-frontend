import { Component, computed, inject, signal } from '@angular/core';

import { NotificationSettingsService, type NotificationSettings } from '@shared/services/notification-settings.service';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { I18nService, type TranslationKey } from '@shared/services/i18n.service';
import { TuiBadge, TuiSwitch } from '@taiga-ui/kit';


const LABELS: Array<[keyof NotificationSettings, TranslationKey, TranslationKey | null]> = [
	['enabled', 'notifications.enabled', 'notifications.enabledHint'],
	['version', 'notifications.version', 'notifications.versionHint'],
	['follow', 'notifications.follow', null],
	['subscribe', 'notifications.subscribe', null],
	['gift', 'notifications.gift', null],
	['resub', 'notifications.resub', null],
	['raid', 'notifications.raid', null],
	['chatter', 'notifications.chatter', null],
	['viewer', 'notifications.viewer', null],
	['quietWhenFocused', 'notifications.quietWhenFocused', 'notifications.quietWhenFocusedHint'],
];

@Component({
	imports: [TuiBadge, TuiButton, TuiIcon, TuiSwitch],
	selector: 'app-notification-settings-page',
	styleUrl: './notification-settings-page.scss',
	templateUrl: './notification-settings-page.html',
})
export default class NotificationSettingsPage {
	private readonly service = inject(NotificationSettingsService);
	readonly saved = signal(false);
	readonly i18n = inject(I18nService);
	readonly settings = signal<NotificationSettings | null>(null);
	readonly rows = computed(() => LABELS.map(([key, label, hint]) => [key, this.i18n.t(label), hint ? this.i18n.t(hint) : ''] as const));

	constructor() {
		this.service.get().subscribe((value) => this.settings.set(value));
	}

	toggleValue(key: keyof NotificationSettings): void {
		const value = this.settings();
		if (!value) return;
		const next = { ...value, [key]: !value[key] };
		this.settings.set(next);
		this.service.save(next).subscribe(() => {
			this.saved.set(true);
			setTimeout(() => this.saved.set(false), 2000);
		});
	}
}
