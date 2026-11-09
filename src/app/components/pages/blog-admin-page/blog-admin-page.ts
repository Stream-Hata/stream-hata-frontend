import type { BlogArticle, BlogStatus } from '@shared/services/blog.service';
import type { TuiEditorToolType } from '@taiga-ui/editor';
import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { imageUrl } from '@shared/helpers/proxy-image';
import { BlogService } from '@shared/services/blog.service';
import { I18nService } from '@shared/services/i18n.service';
import { RoleService } from '@shared/services/role.service';
import { TuiButton, TuiInput, TuiTextfield } from '@taiga-ui/core';
import { provideTuiEditor, TuiEditor, TuiEditorTool } from '@taiga-ui/editor';
import { catchError, of } from 'rxjs';

const EDITOR_TOOLS: readonly TuiEditorToolType[] = [
	TuiEditorTool.Bold,
	TuiEditorTool.Italic,
	TuiEditorTool.Underline,
	TuiEditorTool.Strikethrough,
	TuiEditorTool.Link,
	TuiEditorTool.Anchor,
	TuiEditorTool.List,
	TuiEditorTool.Quote,
	TuiEditorTool.Code,
	TuiEditorTool.Size,
	TuiEditorTool.Align,
	TuiEditorTool.Color,
	TuiEditorTool.Hilite,
	TuiEditorTool.HR,
	TuiEditorTool.Img,
	TuiEditorTool.Attach,
	TuiEditorTool.Table,
	TuiEditorTool.CellColor,
	TuiEditorTool.MergeCells,
	TuiEditorTool.SplitCells,
	TuiEditorTool.RowsColumnsManaging,
	TuiEditorTool.Sub,
	TuiEditorTool.Sup,
	TuiEditorTool.Details,
	TuiEditorTool.Group,
	TuiEditorTool.Tex,
	TuiEditorTool.Undo,
	TuiEditorTool.Clear,
];

@Component({
	imports: [
		DatePipe,
		ReactiveFormsModule,
		RouterLink,
		TuiButton,
		TuiEditor,
		TuiInput,
		TuiTextfield,
	],
	providers: [provideTuiEditor()],
	selector: 'app-blog-admin-page',
	styleUrl: './blog-admin-page.scss',
	templateUrl: './blog-admin-page.html',
})
export default class BlogAdminPage {
	readonly i18n = inject(I18nService);
	readonly role = inject(RoleService);
	readonly tools = EDITOR_TOOLS;
	private readonly blog = inject(BlogService);
	private readonly destroyRef = inject(DestroyRef);

	readonly items = signal<BlogArticle[]>([]);
	readonly loading = signal(true);
	readonly saving = signal(false);
	readonly uploading = signal(false);
	readonly error = signal('');
	readonly saved = signal('');
	readonly pendingDelete = signal<BlogArticle | null>(null);
	readonly editing = signal<BlogArticle | null>(null);
	readonly creating = signal(false);
	readonly statusFilter = signal<BlogStatus | ''>('');
	readonly draftStatus = signal<BlogStatus>('draft');
	readonly editingId = computed(() => this.editing()?.id ?? 0);
	readonly statusLabels = computed<Record<BlogStatus, string>>(() => ({
		draft: this.i18n.t('blog.draft'),
		published: this.i18n.t('blog.published'),
	}));

	readonly titleControl = new FormControl('', { nonNullable: true });
	readonly slugControl = new FormControl('', { nonNullable: true });
	readonly excerptControl = new FormControl('', { nonNullable: true });
	readonly coverControl = new FormControl('', { nonNullable: true });
	readonly contentControl = new FormControl('', { nonNullable: true });
	readonly coverValue = toSignal(this.coverControl.valueChanges, { initialValue: this.coverControl.value });
	readonly coverPreview = computed(() => {
		const value = this.coverValue().trim();

		return value.startsWith('/') ? value : value ? imageUrl(value) : '';
	});

	constructor() {
		this.load();
	}

	load(): void {
		this.loading.set(true);
		this.blog
			.adminList({ status: this.statusFilter(), limit: 100 })
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((response) => {
				if (response) {
					this.items.set(response.items);
				} else {
					this.error.set(this.i18n.t('blog.error'));
				}
				this.loading.set(false);
			});
	}

	filter(status: BlogStatus | ''): void {
		this.statusFilter.set(status);
		this.load();
	}

	newArticle(): void {
		this.creating.set(true);
		this.editing.set(null);
		this.draftStatus.set('draft');
		this.titleControl.setValue('');
		this.slugControl.setValue('');
		this.excerptControl.setValue('');
		this.coverControl.setValue('');
		this.contentControl.setValue('');
		this.error.set('');
		this.saved.set('');
	}

	edit(article: BlogArticle): void {
		this.blog
			.adminGet(article.id)
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((full) => {
				if (!full) {
					this.error.set(this.i18n.t('blog.error'));

					return;
				}

				this.creating.set(false);
				this.editing.set(full);
				this.draftStatus.set(full.status);
				this.titleControl.setValue(full.title);
				this.slugControl.setValue(full.slug);
				this.excerptControl.setValue(full.excerpt);
				this.coverControl.setValue(full.coverUrl);
				this.contentControl.setValue(full.content ?? '');
				this.error.set('');
				this.saved.set('');
				window.scrollTo({ top: 0, behavior: 'smooth' });
			});
	}

	cancel(): void {
		this.creating.set(false);
		this.editing.set(null);
	}

	save(status: BlogStatus): void {
		const title = this.titleControl.value.trim();

		if (!title || this.saving()) {
			return;
		}

		this.saving.set(true);
		this.error.set('');
		this.saved.set('');

		const input = {
			title,
			slug: this.slugControl.value.trim(),
			excerpt: this.excerptControl.value.trim(),
			content: this.contentControl.value,
			coverUrl: this.coverControl.value.trim(),
			status,
		};
		const request = this.editing()
			? this.blog.update(this.editing()?.id ?? 0, input)
			: this.blog.create(input);

		request
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((article) => {
				this.saving.set(false);
				if (!article) {
					this.error.set(this.i18n.t('blog.error'));

					return;
				}

				this.creating.set(false);
				this.editing.set(article);
				this.draftStatus.set(article.status);
				this.slugControl.setValue(article.slug);
				this.saved.set(this.i18n.t('blog.saved'));
				this.load();
			});
	}

	uploadCover(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		input.value = '';

		if (!file) {
			return;
		}

		this.uploading.set(true);
		this.error.set('');
		this.blog
			.upload(file)
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				this.uploading.set(false);
				if (!result) {
					this.error.set(this.i18n.t('blog.error'));

					return;
				}

				this.coverControl.setValue(result.url);
			});
	}

	insertImage(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		input.value = '';

		if (!file) {
			return;
		}

		this.uploading.set(true);
		this.error.set('');
		this.blog
			.upload(file)
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				this.uploading.set(false);
				if (!result) {
					this.error.set(this.i18n.t('blog.error'));

					return;
				}

				const current = this.contentControl.value;
				const image = `<p><img src="${result.url}" alt="" /></p>`;
				this.contentControl.setValue(`${current}${current ? '\n' : ''}${image}`);
			});
	}

	remove(article: BlogArticle): void {
		this.pendingDelete.set(article);
	}

	confirmDelete(): void {
		const article = this.pendingDelete();

		if (!article) {
			return;
		}

		this.pendingDelete.set(null);
		this.blog
			.remove(article.id)
			.pipe(
				catchError(() => of(null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				if (!result) {
					this.error.set(this.i18n.t('blog.error'));

					return;
				}

				if (this.editing()?.id === article.id) {
					this.cancel();
				}
				this.load();
			});
	}
}
