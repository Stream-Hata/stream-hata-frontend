import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface FeedbackReport {
	area: 'backend' | 'frontend' | 'desktop';
	platform: string;
	reason: string;
	attachments: FeedbackAttachment[];
	reasons: string[];
	kind: 'bug' | 'suggestion' | 'feedback';
	title: string;
	description: string;
	steps: string;
	expected: string;
	actual: string;
	version: string;
	severity: string;
	pageUrl: string;
	environment: string;
	contact: string;
	author: string;
	website: string;
	diagnostics: FeedbackDiagnostics;
}

export interface FeedbackDiagnostics {
	enabled: boolean;
	period: string;
	sources: string[];
}

export interface FeedbackReportSummary {
	prefix: string;
	number: number;
	title: string;
	status: string;
	issueUrl: string;
	createdAt: string;
	source: string;
}

export interface FeedbackResult {
	number: number;
	prefix: string;
	issueUrl: string;
	kind: string;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
	private readonly http = inject(HttpClient);

	submit(report: FeedbackReport) {
		return this.http.post<FeedbackResult>('rgg-sync/feedback', report);
	}

	mine() {
		return this.http.get<{ items: FeedbackReportSummary[] }>('rgg-sync/feedback/mine');
	}

	telegramLink() {
		return this.http.post<{ url: string }>('rgg-sync/feedback/telegram-link', {});
	}

	similar(query: string) {
		return this.http.get<{ items: FeedbackReportSummary[] }>('rgg-sync/feedback/similar', {
			params: { q: query },
		});
	}
}

export interface FeedbackAttachment {
	label: string;
	url: string;
	enabled: boolean;
}
