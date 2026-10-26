import type { Integration, IntegrationsResponse } from '@shared/types/integration';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IntegrationsService {
	private readonly http = inject(HttpClient);

	list() {
		return this.http.get<IntegrationsResponse>('rgg-sync/integrations');
	}

	setEnabled(id: string, enabled: boolean) {
		return this.http.post<Integration>(`rgg-sync/integrations/${id}`, { enabled });
	}

	webhookUrl(provider: string): string {
		return `${location.origin}/rgg-sync/donations/webhook/${provider}`;
	}
}
