import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface FeedbackReport {
	area: 'backend' | 'frontend' | 'desktop';
	reason: string;
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
}
