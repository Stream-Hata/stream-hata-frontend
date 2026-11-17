import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface ServiceStatus {
	key: string;
	name: string;
	state: 'operational' | 'degraded' | 'down';
	detail: string;
	latencyMs: number;
}

export interface StatusIncident {
	id: number;
	code: string;
	codename: string;
	title: string;
	description: string;
	severity: string;
	status: string;
	startedAt: string;
	resolvedAt?: string;
	updatedAt: string;
}

export interface StatusSnapshot {
	status: 'operational' | 'degraded' | 'down';
	checkedAt: string;
	services: ServiceStatus[];
	incidents: StatusIncident[];
}

@Injectable({ providedIn: 'root' })
export class StatusService {
	private readonly http = inject(HttpClient);

	get() {
		return this.http.get<StatusSnapshot>('rgg-sync/status');
	}
}
