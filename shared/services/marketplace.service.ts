import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export type PluginKind = 'plugin' | 'mod';
export type PluginStatus = 'pending' | 'published' | 'rejected' | 'blocked';

export interface MarketplacePlugin {
	id: number;
	slug: string;
	name: string;
	summary: string;
	kind: PluginKind;
	status: PluginStatus;
	latestVersion: string;
	publisherSlug: string;
	permissions: string[];
	artifactUrl: string;
	artifactSha256: string;
	signatureType: string;
	signature: string;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
	publishedAt?: string;
}

export interface MarketplaceVersion {
	id: number;
	pluginId: number;
	version: string;
	artifactUrl: string;
	artifactSha256: string;
	artifactSize: number;
	signatureType: string;
	signature: string;
	status: PluginStatus;
	createdAt: string;
	publishedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class MarketplaceService {
	private readonly http = inject(HttpClient);

	list(q = '') {
		return this.http.get<{ items: MarketplacePlugin[] }>('rgg-sync/plugins', {
			params: q ? { q } : {},
		});
	}

	get(slug: string) {
		return this.http.get<{ plugin: MarketplacePlugin; versions: MarketplaceVersion[] }>(
			`rgg-sync/plugins/${encodeURIComponent(slug)}`,
		);
	}
}
