import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface WelcomeConfig {
	enabled: boolean;
	messages: string[];
}

@Injectable({ providedIn: 'root' })
export class WelcomeService {
	private readonly http = inject(HttpClient);

	get() {
		return this.http.get<WelcomeConfig>('rgg-sync/welcome');
	}

	save(config: WelcomeConfig) {
		return this.http.post<WelcomeConfig>('rgg-sync/welcome', config);
	}
}
