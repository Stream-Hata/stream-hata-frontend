import type { ElementRef } from '@angular/core';
import type { SafeHtml } from '@angular/platform-browser';
import type { BlogArticle } from '@shared/services/blog.service';
import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { imageUrl } from '@shared/helpers/proxy-image';
import { BlogService } from '@shared/services/blog.service';
import { I18nService } from '@shared/services/i18n.service';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { catchError, of } from 'rxjs';

@Component({
	imports: [DatePipe, RouterLink, TuiButton, TuiIcon],
	selector: 'app-blog-article-page',
	styleUrl: './blog-article-page.scss',
	templateUrl: './blog-article-page.html',
})
export default class BlogArticlePage {
	readonly i18n = inject(I18nService);
	readonly imageUrl = imageUrl;
	private readonly blog = inject(BlogService);
	private readonly route = inject(ActivatedRoute);
	private readonly sanitizer = inject(DomSanitizer);
	private readonly destroyRef = inject(DestroyRef);

	readonly article = signal<BlogArticle | null>(null);
	readonly activeHeading = signal('');
	readonly contentRef = viewChild<ElementRef<HTMLElement>>('articleContent');
	private observer?: IntersectionObserver;
	readonly loading = signal(true);
	readonly error = signal('');
	readonly coverSrc = computed(() => imageUrl(this.article()?.coverUrl));
	readonly reading = computed(() => {
		const content = this.article()?.content ?? '';
		const words = content
			.replace(/<[^>]*>/g, ' ')
			.trim()
			.split(/\s+/)
			.filter(Boolean)
			.length;

		return Math.max(1, Math.ceil(words / 180));
	});

	readonly rendered = computed(() => {
		const source = this.article()?.content ?? '';
		const toc: { id: string; text: string; level: number }[] = [];
		let index = 0;
		const html = source.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi, (_match, level, attrs, inner) => {
			index += 1;
			const id = `article-heading-${index}`;
			const text = inner.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

			if (text) {
				toc.push({ id, text, level: Number(level) });
			}

			return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
		});

		return { html, toc };
	});

	readonly toc = computed(() => this.rendered().toc);
	readonly safeContent = computed<SafeHtml>(() =>
		this.sanitizer.bypassSecurityTrustHtml(this.rendered().html),
	);

	constructor() {
		const slug = this.route.snapshot.paramMap.get('slug') ?? '';
		this.load(slug);
		this.destroyRef.onDestroy(() => this.observer?.disconnect());
	}

	load(slug: string): void {
		if (!slug) {
			this.error.set(this.i18n.t('blog.notFound'));
			this.loading.set(false);

			return;
		}

		this.blog
			.get(slug)
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((article) => {
				if (!article) {
					this.error.set(this.i18n.t('blog.notFound'));
				} else {
					this.article.set(article);
					document.title = `${article.title} · StreamHata`;
					setTimeout(() => this.setupScrollSpy(), 50);
				}
				this.loading.set(false);
			});
	}

	private setupScrollSpy(): void {
		if (typeof IntersectionObserver === 'undefined') {
			return;
		}

		this.observer?.disconnect();
		const root = this.contentRef()?.nativeElement;

		if (!root) {
			return;
		}

		const headings = Array.from(root.querySelectorAll<HTMLElement>('h2[id], h3[id]'));

		if (!headings.length) {
			return;
		}

		this.activeHeading.set(headings[0].id);
		this.observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);

				if (visible[0]) {
					this.activeHeading.set((visible[0].target as HTMLElement).id);
				}
			},
			{ rootMargin: '-15% 0px -70% 0px', threshold: [0, 1] },
		);

		headings.forEach((heading) => this.observer?.observe(heading));
	}
}
