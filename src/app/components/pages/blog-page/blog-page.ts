import type { BlogArticle } from '@shared/services/blog.service';
import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { imageUrl } from '@shared/helpers/proxy-image';
import { BlogService } from '@shared/services/blog.service';
import { I18nService } from '@shared/services/i18n.service';
import { RoleService } from '@shared/services/role.service';
import { TuiButton, TuiIcon, TuiInput, TuiTextfield } from '@taiga-ui/core';
import { catchError, debounceTime, distinctUntilChanged, of } from 'rxjs';

@Component({
	imports: [DatePipe, ReactiveFormsModule, RouterLink, TuiButton, TuiIcon, TuiInput, TuiTextfield],
	selector: 'app-blog-page',
	styleUrl: './blog-page.scss',
	templateUrl: './blog-page.html',
})
export default class BlogPage {
	readonly i18n = inject(I18nService);
	readonly role = inject(RoleService);
	readonly imageUrl = imageUrl;
	private readonly blog = inject(BlogService);
	private readonly destroyRef = inject(DestroyRef);

	readonly items = signal<BlogArticle[]>([]);
	readonly cards = computed(() =>
		this.items().map((article) => ({
			...article,
			coverSrc: imageUrl(article.coverUrl),
			reading: this.readingMinutes(article),
		})),
	);

	readonly total = signal(0);
	readonly loading = signal(true);
	readonly error = signal('');
	readonly search = new FormControl('', { nonNullable: true });

	constructor() {
		this.search.valueChanges
			.pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.load());
		this.load();
	}

	load(): void {
		this.loading.set(true);
		this.error.set('');
		this.blog
			.list({ q: this.search.value.trim(), limit: 50 })
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((response) => {
				if (!response) {
					this.error.set(this.i18n.t('blog.error'));
					this.loading.set(false);

					return;
				}

				this.items.set(response.items);
				this.total.set(response.total);
				this.loading.set(false);
			});
	}

	private readingMinutes(article: BlogArticle): number {
		const text = `${article.excerpt} ${article.content ?? ''}`.replace(/<[^>]*>/g, ' ');
		const words = text.trim().split(/\s+/).filter(Boolean).length;

		return Math.max(1, Math.ceil(words / 180));
	}
}
