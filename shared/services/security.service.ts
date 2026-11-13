import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export type SecurityIncidentStatus =
	| 'pending_review'
	| 'acknowledged'
	| 'confirmed_fraud'
	| 'false_positive'
	| 'auto_banned'
	| 'closed';

export type SecurityVerdict =
	| 'infected'
	| 'malware'
	| 'tampered'
	| 'fake'
	| 'fraud'
	| 'dangerous_code'
	| 'suspicious'
	| 'blocked';

export type SecurityIncidentKind =
	'file' | 'code' | 'mod' | 'modpack' | 'app' | 'update' | 'archive' | 'link';

export interface SecurityIncident {
	id: number;
	createdAt: string;
	updatedAt: string;
	kind: SecurityIncidentKind;
	verdict: SecurityVerdict;
	severity: 'critical' | 'warning' | 'info';
	status: SecurityIncidentStatus;
	chatType: string;
	chatId: string;
	messageId?: number;
	senderId?: number;
	senderLogin: string;
	recipientId?: number;
	fileName: string;
	fileHash: string;
	reason: string;
	report: Record<string, unknown>;
	autoBan: boolean;
	reviewDeadline: string;
	autoBanAt?: string;
	acknowledgedAt?: string;
	acknowledgedBy?: string;
	reviewedAt?: string;
	reviewedBy?: string;
	action?: string;
	banApplied: boolean;
}

export interface SecurityAlert {
	id: number;
	incidentId: number;
	recipientLogin: string;
	channel: string;
	status: string;
	createdAt: string;
	deliveredAt?: string;
	readAt?: string;
}

export interface SecurityIncidentInput {
	kind: SecurityIncidentKind;
	verdict: SecurityVerdict;
	severity?: string;
	chatType?: string;
	chatId?: string;
	messageId?: number;
	senderId?: number;
	senderLogin?: string;
	recipientId?: number;
	fileName?: string;
	fileHash?: string;
	reason?: string;
	report?: Record<string, unknown>;
}

export type SecurityResolveAction = 'confirm_fraud' | 'false_positive' | 'close';

export interface SecurityHashRule {
	id: number;
	sha256: string;
	verdict: 'malicious' | 'trusted';
	reason: string;
	source: string;
	createdBy: string;
	createdAt: string;
}

export interface LinkReport {
	url: string;
	domain: string;
	verdict: 'link_safe' | 'link_unknown' | 'link_suspicious' | 'link_malicious' | 'link_download';
	severity: 'critical' | 'warning' | 'info';
	reason: string;
	source: string;
	checkedAt: string;
}

@Injectable({ providedIn: 'root' })
export class SecurityService {
	private readonly http = inject(HttpClient);

	incidents(status = '', limit = 100) {
		const params: Record<string, string | number> = { limit };
		if (status) {
			params['status'] = status;
		}

		return this.http.get<{ incidents: SecurityIncident[] }>('rgg-sync/security/incidents', {
			params,
		});
	}

	incident(id: number) {
		return this.http.get<SecurityIncident>(`rgg-sync/security/incidents/${id}`);
	}

	alerts() {
		return this.http.get<{ alerts: SecurityAlert[] }>('rgg-sync/security/alerts');
	}

	acknowledge(id: number) {
		return this.http.post<SecurityIncident>(`rgg-sync/security/incidents/${id}/ack`, {});
	}

	resolve(id: number, action: SecurityResolveAction, note = '') {
		return this.http.post<SecurityIncident>(`rgg-sync/security/incidents/${id}/resolve`, {
			action,
			note,
		});
	}

	checkLink(url: string) {
		return this.http.post<LinkReport>('rgg-sync/security/links/check', { url });
	}

	hashRules() {
		return this.http.get<{ items: SecurityHashRule[] }>('rgg-sync/security/hashes');
	}

	addHashRule(input: { sha256: string; verdict: 'malicious' | 'trusted'; reason: string }) {
		return this.http.post<SecurityHashRule>('rgg-sync/security/hashes', input);
	}

	deleteHashRule(id: number) {
		return this.http.delete<{ ok: boolean }>(`rgg-sync/security/hashes/${id}`);
	}

	bulkHashRules(file: File, verdict: 'malicious' | 'trusted') {
		const form = new FormData();
		form.append('file', file);

		return this.http.post<{ ok: boolean; added: number; failed: number; errors: string[] }>(
			'rgg-sync/security/hashes/bulk',
			form,
			{ params: { verdict } },
		);
	}
}
