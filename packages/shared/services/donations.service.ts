import type { DonationsSnapshot } from '@shared/types/donation';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DonationsService {
	private readonly http = inject(HttpClient);

	getSnapshot() {
		return this.http.get<DonationsSnapshot>('rgg-sync/donations');
	}

	getDonationAlertsAuthUrl() {
		return this.http.get<{ state: string; url: string }>('rgg-sync/donations/donationalerts/auth');
	}
}
