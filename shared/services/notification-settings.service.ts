import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface NotificationSettings {
	enabled: boolean;
	version: boolean;
	follow: boolean;
	subscribe: boolean;
	gift: boolean;
	resub: boolean;
	raid: boolean;
	chatter: boolean;
	viewer: boolean;
	quietWhenFocused: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationSettingsService {
	private readonly http = inject(HttpClient);
	get() { return this.http.get<NotificationSettings>('rgg-sync/notifications/settings'); }
	save(value: NotificationSettings) { return this.http.put<NotificationSettings>('rgg-sync/notifications/settings', value); }
}
