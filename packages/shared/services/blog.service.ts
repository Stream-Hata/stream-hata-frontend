import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export type BlogStatus = 'draft' | 'published';

export interface BlogArticle {
	id: number;
	slug: string;
	title: string;
	excerpt: string;
	content?: string;
	coverUrl: string;
	status: BlogStatus;
	authorId: number;
	authorLogin: string;
	authorName: string;
	publishedAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface BlogList {
	items: BlogArticle[];
	total: number;
	limit: number;
	offset: number;
}

export interface BlogInput {
	title: string;
	slug?: string;
	excerpt?: string;
	content?: string;
	coverUrl?: string;
	status: BlogStatus;
}

@Injectable({ providedIn: 'root' })
export class BlogService {
	private readonly http = inject(HttpClient);

	list(params: { limit?: number; offset?: number; q?: string } = {}) {
		let search = new HttpParams();

		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined && value !== '') {
				search = search.set(key, String(value));
			}
		}

		return this.http.get<BlogList>('rgg-sync/blog', { params: search });
	}

	get(slug: string) {
		return this.http.get<BlogArticle>(`rgg-sync/blog/${encodeURIComponent(slug)}`);
	}

	adminList(params: { limit?: number; offset?: number; q?: string; status?: BlogStatus | '' } = {}) {
		let search = new HttpParams();

		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined && value !== '') {
				search = search.set(key, String(value));
			}
		}

		return this.http.get<BlogList>('rgg-sync/blog/admin', { params: search });
	}

	adminGet(id: number) {
		return this.http.get<BlogArticle>(`rgg-sync/blog/admin/${id}`);
	}

	create(input: BlogInput) {
		return this.http.post<BlogArticle>('rgg-sync/blog/admin', input);
	}

	update(id: number, input: BlogInput) {
		return this.http.put<BlogArticle>(`rgg-sync/blog/admin/${id}`, input);
	}

	remove(id: number) {
		return this.http.delete<{ ok: boolean }>(`rgg-sync/blog/admin/${id}`);
	}

	upload(file: File) {
		const form = new FormData();

		form.append('file', file);

		return this.http.post<{ url: string }>('rgg-sync/blog/upload', form);
	}
}
