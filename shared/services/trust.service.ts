import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface TrustPublisher {
	id: number;
	slug: string;
	name: string;
	trustLevel: string;
	homepage: string;
	createdAt: string;
}

export interface TrustProduct {
	id: number;
	publisherId: number;
	slug: string;
	name: string;
	platform: string;
	packageName: string;
	kind: string;
	createdAt: string;
}

export interface TrustSource {
	id: number;
	productId: number;
	url: string;
	kind: string;
	trustLevel: string;
	createdAt: string;
}

export interface TrustRelease {
	id: number;
	productId?: number;
	productSlug: string;
	platform: string;
	channel: string;
	version: string;
	versionCode: number;
	packageName: string;
	sha256: string;
	signatureSha256: string;
	signatureType: string;
	fileSize: number;
	url: string;
	publishedAt: string;
}

export interface TrustAdminData {
	publishers: TrustPublisher[];
	products: TrustProduct[];
	sources: TrustSource[];
	releases: TrustRelease[];
}

export interface TrustReleaseInput {
	productSlug: string;
	platform: string;
	channel: string;
	version: string;
	versionCode: number;
	packageName: string;
	sha256: string;
	signatureSha256: string;
	signatureType: string;
	fileSize: number;
	url: string;
}

@Injectable({ providedIn: 'root' })
export class TrustService {
	private readonly http = inject(HttpClient);

	admin() {
		return this.http.get<TrustAdminData>('rgg-sync/trust/admin');
	}

	savePublisher(input: Partial<TrustPublisher>) {
		return this.http.post<TrustPublisher>('rgg-sync/trust/admin/publishers', input);
	}

	deletePublisher(id: number) {
		return this.http.delete<{ ok: boolean }>('rgg-sync/trust/admin/publishers', {
			params: { id },
		});
	}

	saveProduct(input: Partial<TrustProduct>) {
		return this.http.post<TrustProduct>('rgg-sync/trust/admin/products', input);
	}

	deleteProduct(id: number) {
		return this.http.delete<{ ok: boolean }>('rgg-sync/trust/admin/products', {
			params: { id },
		});
	}

	saveSource(input: Partial<TrustSource>) {
		return this.http.post<TrustSource>('rgg-sync/trust/admin/sources', input);
	}

	deleteSource(id: number) {
		return this.http.delete<{ ok: boolean }>('rgg-sync/trust/admin/sources', {
			params: { id },
		});
	}

	saveRelease(input: TrustReleaseInput) {
		return this.http.post<TrustRelease>('rgg-sync/trust/releases', input);
	}

	deleteRelease(id: number) {
		return this.http.delete<{ ok: boolean }>(`rgg-sync/trust/admin/releases/${id}`);
	}
}
