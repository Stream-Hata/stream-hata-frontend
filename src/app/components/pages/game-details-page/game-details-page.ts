import type { GameDiscussionMessage } from '@shared/services/games-catalog.service';
import type { Game, GameTier } from '@shared/types/game';
import type { TuiEditorToolType } from '@taiga-ui/editor';
import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { imageUrl } from '@shared/helpers/proxy-image';
import { GamesCatalogService } from '@shared/services/games-catalog.service';
import { I18nService } from '@shared/services/i18n.service';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { provideTuiEditor, TuiEditor, TuiEditorTool } from '@taiga-ui/editor';
import { TuiBadge } from '@taiga-ui/kit';
import { catchError, of } from 'rxjs';

const TIER_LABELS: Record<GameTier, string> = {
	none: '',
	gold: 'Gold',
	diamond: 'Diamond',
	platinum: 'Platinum',
};

function hasServiceSource(game: Game): boolean {
	return game.sources.some((source) =>
		['igdb', 'rawg', 'mobygames', 'old-games', 'giantbomb', 'thegamesdb', 'wikipedia', 'longplay'].includes(
			source.id,
		),
	);
}

@Component({
	imports: [DatePipe, ReactiveFormsModule, RouterLink, TuiBadge, TuiButton, TuiEditor, TuiIcon],
	providers: [provideTuiEditor()],
	selector: 'app-game-details-page',
	styleUrl: './game-details-page.scss',
	templateUrl: './game-details-page.html',
})
export default class GameDetailsPage {
	protected readonly imageUrl = imageUrl;
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);

	private readonly catalog = inject(GamesCatalogService);
	readonly i18n = inject(I18nService);

	readonly genres = computed(() => {
		const game = this.game();

		return game?.genresRu?.length ? game.genresRu : (game?.genres ?? []);
	});

	readonly description = computed(() => {
		const game = this.game();
		if (!game) return '';
		if (this.i18n.language() === 'ru') {
			return game.descriptionRu || game.description || '';
		}

		return game.description || '';
	});

	readonly game = signal<Game | null>(null);
	readonly loading = signal(true);
	readonly discussion = signal<GameDiscussionMessage[]>([]);
	readonly discussionLoading = signal(false);
	readonly discussionSending = signal(false);
	readonly discussionText = signal('');
	readonly discussionControl = new FormControl('', { nonNullable: true });
	readonly editorMode = signal<'max' | 'standard' | 'minimal'>('max');
	readonly discussionError = signal('');
	readonly discussionSort = signal<'threads' | 'new' | 'old'>('threads');
	readonly discussionViewed = signal(1);
	readonly discussionProgress = computed(() => {
		const total = this.discussion().length;
		return total > 1 ? Math.round((this.discussionViewed() / total) * 100) : 0;
	});

	readonly replyingTo = signal<GameDiscussionMessage | null>(null);
	readonly activeSection = signal('game-shots');
	readonly sections = [
		{ id: 'game-shots', label: 'Скриншоты' },
		{ id: 'game-emulators', label: 'Эмуляторы' },
		{ id: 'game-info', label: 'Информация' },
		{ id: 'game-completion', label: 'Прохождение' },
		{ id: 'game-downloads', label: 'Скачать' },
		{ id: 'game-extra', label: 'Дополнительно' },
		{ id: 'game-mods', label: 'Моды и коллекции' },
		{ id: 'game-discussion', label: 'Обсуждение' },
	];

	readonly editorTools = computed<readonly TuiEditorToolType[]>(() => {
		const basic: TuiEditorToolType[] = [
			TuiEditorTool.Bold,
			TuiEditorTool.Italic,
			TuiEditorTool.Underline,
			TuiEditorTool.Link,
			TuiEditorTool.List,
			TuiEditorTool.Quote,
			TuiEditorTool.Undo,
			TuiEditorTool.Clear,
		];
		if (this.editorMode() === 'minimal') {
			return basic.slice(0, 6);
		}
		if (this.editorMode() === 'standard') {
			return [
				...basic,
				TuiEditorTool.Strikethrough,
				TuiEditorTool.Code,
				TuiEditorTool.Size,
				TuiEditorTool.Align,
				TuiEditorTool.Color,
				TuiEditorTool.Hilite,
				TuiEditorTool.HR,
			];
		}
		return [
			...basic,
			TuiEditorTool.Anchor,
			TuiEditorTool.Attach,
			TuiEditorTool.Strikethrough,
			TuiEditorTool.Code,
			TuiEditorTool.Details,
			TuiEditorTool.Group,
			TuiEditorTool.HR,
			TuiEditorTool.Img,
			TuiEditorTool.Size,
			TuiEditorTool.Align,
			TuiEditorTool.Color,
			TuiEditorTool.Hilite,
			TuiEditorTool.Table,
			TuiEditorTool.CellColor,
			TuiEditorTool.MergeCells,
			TuiEditorTool.SplitCells,
			TuiEditorTool.RowsColumnsManaging,
			TuiEditorTool.Sub,
			TuiEditorTool.Sup,
			TuiEditorTool.Tex,
		];
	});

	readonly threadedDiscussion = computed(() => {
		const items = this.discussion();
		const byId = new Map(items.map((item) => [item.id, item]));
		const children = new Map<number, GameDiscussionMessage[]>();

		for (const item of items) {
			const parent = item.parentId && byId.has(item.parentId) ? item.parentId : null;
			if (parent === null) {
				continue;
			}
			children.set(parent, [...(children.get(parent) ?? []), item]);
		}

		const latest = (item: GameDiscussionMessage, seen = new Set<number>()): number => {
			if (seen.has(item.id)) {
				return Date.parse(item.createdAt) || 0;
			}
			seen.add(item.id);
			const nested = children.get(item.id) ?? [];
			return nested.reduce(
				(value, child) => Math.max(value, latest(child, seen)),
				Date.parse(item.createdAt) || 0,
			);
		};

		const roots = items.filter((item) => !item.parentId || !byId.has(item.parentId));
		const sort = this.discussionSort();
		roots.sort((left, right) => {
			if (sort === 'new') {
				return (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0);
			}
			if (sort === 'old') {
				return (Date.parse(left.createdAt) || 0) - (Date.parse(right.createdAt) || 0);
			}
			return latest(right) - latest(left);
		});

		const result: Array<GameDiscussionMessage & { depth: number }> = [];
		const append = (item: GameDiscussionMessage, depth: number, seen: Set<number>): void => {
			if (seen.has(item.id)) {
				return;
			}
			seen.add(item.id);
			result.push({ ...item, depth });
			const replies = [...(children.get(item.id) ?? [])].sort(
				(left, right) => (Date.parse(left.createdAt) || 0) - (Date.parse(right.createdAt) || 0),
			);
			for (const reply of replies) {
				append(reply, depth + 1, seen);
			}
		};

		const seen = new Set<number>();
		for (const root of roots) {
			append(root, 0, seen);
		}

		return result;
	});

	readonly desktop = navigator.userAgent.includes('NamelessStreamHataDesktop') || '__TAURI_INTERNALS__' in window;
	private slug = '';
	private sectionObserver?: IntersectionObserver;

	constructor() {
		try {
			const stored = localStorage.getItem('nsh.discussion.editor-mode');
			if (stored === 'standard' || stored === 'minimal') {
				this.editorMode.set(stored);
			}
		} catch {
			// storage unavailable
		}
		this.discussionControl.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((value) => this.discussionText.set(value ?? ''));
		effect(() => {
			if (!this.game()) {
				return;
			}

			setTimeout(() => this.setupScrollSpy(), 0);
		});

		const preload = this.route.snapshot.data['game'] as Game | null;

		if (preload) {
			this.game.set(preload);
			this.loading.set(false);
			this.loadDiscussion(preload.slug);

			if (!hasServiceSource(preload) || !preload.description || !preload.year) {
				setTimeout(() => this.fetchGame(1), 1200);
			}
		}

		this.route.data
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((data) => {
				const game = data['game'] as Game | null;

				if (game && game.slug === this.slug) {
					this.game.set(game);
					this.loading.set(false);
				}
			});

		this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
			const slug = params.get('slug') ?? '';

			if (slug === this.slug && this.game()) {
				return;
			}
			this.slug = slug;
			this.loadDiscussion(slug);
			const resolved = this.route.snapshot.data['game'] as Game | null;

			if (resolved?.slug === slug) {
				this.game.set(resolved);
				this.loading.set(false);
				return;
			}
			this.loading.set(true);
			this.fetchGame();
		});

		this.destroyRef.onDestroy(() => this.sectionObserver?.disconnect());
	}

	openExternal(event: MouseEvent, url: string): void {
		if (!this.desktop) {
			return;
		}

		event.preventDefault();
		location.href = `streamhata://open?url=${encodeURIComponent(url)}`;
	}

	refresh(): void {
		if (this.loading()) {
			return;
		}

		this.loading.set(true);
		this.catalog
			.get(this.slug, true)
			.pipe(
				catchError(() => of(null as Game | null)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((game) => {
				this.game.set(game);
				this.loading.set(false);
			});
	}

	private loadDiscussion(slug: string): void {
		if (!slug) {
			return;
		}

		this.discussionLoading.set(true);
		this.discussionError.set('');
		this.catalog
			.discussion(slug)
			.pipe(catchError(() => of({ items: [] })), takeUntilDestroyed(this.destroyRef))
			.subscribe((result) => {
				this.discussion.set(result.items ?? []);
				this.discussionViewed.set(result.items?.length ? 1 : 0);
				this.discussionLoading.set(false);
			});
	}

	onDiscussionInput(event: Event): void {
		this.discussionText.set((event.target as HTMLTextAreaElement).value);
	}

	submitDiscussion(event: Event): void {
		event.preventDefault();
		const message = this.discussionControl.value.trim();

		if (!message || this.discussionSending()) {
			return;
		}

		this.discussionSending.set(true);
		this.discussionError.set('');
		this.catalog
			.postDiscussion(this.slug, message, this.replyingTo()?.id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (item) => {
					this.discussion.update((items) => [...items, item]);
					this.discussionControl.setValue('');
					this.replyingTo.set(null);
					this.discussionViewed.set(Math.max(1, this.discussionViewed()));
					this.discussionSending.set(false);
				},
				error: (error) => {
					this.discussionSending.set(false);
					this.discussionError.set(
						error?.status === 401
							? this.i18n.t('discussion.loginRequired')
							: this.i18n.t('discussion.sendError'),
					);
				},
			});
	}

	likeMessage(message: GameDiscussionMessage): void {
		this.catalog.likeDiscussion(this.slug, message.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: (result) =>
				this.discussion.update((items) =>
					items.map((item) =>
						item.id === message.id
							? { ...item, liked: result.liked, likes: result.likes }
							: item,
					),
				),
			error: (error) =>
				this.discussionError.set(
					error?.status === 401
						? this.i18n.t('discussion.loginLike')
						: this.i18n.t('discussion.likeError'),
				),
		});
	}

	deleteMessage(message: GameDiscussionMessage): void {
		this.catalog.deleteDiscussion(this.slug, message.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: () => this.discussion.update((items) => items.filter((item) => item.id !== message.id)),
			error: () => this.discussionError.set(this.i18n.t('discussion.deleteError')),
		});
	}

	onDiscussionScroll(event: Event): void {
		const element = event.target as HTMLElement;
		const total = this.discussion().length;

		if (total <= 1) {
			this.discussionViewed.set(total);
			return;
		}

		const max = element.scrollHeight - element.clientHeight;
		if (max <= 0) {
			this.discussionViewed.set(total);
			return;
		}

		const ratio = Math.min(1, Math.max(0, element.scrollTop / max));
		this.discussionViewed.set(Math.max(1, Math.min(total, Math.ceil(ratio * total) || 1)));
	}

	replyTo(message: GameDiscussionMessage): void {
		this.replyingTo.set(message);
		setTimeout(() => document.getElementById('game-discussion-input')?.focus(), 0);
	}

	cancelReply(): void {
		this.replyingTo.set(null);
	}

	setDiscussionSort(value: string): void {
		this.discussionSort.set(value === 'new' || value === 'old' ? value : 'threads');
	}

	setEditorMode(value: string): void {
		const mode = value === 'standard' || value === 'minimal' ? value : 'max';
		this.editorMode.set(mode);
		try {
			localStorage.setItem('nsh.discussion.editor-mode', mode);
		} catch {
			// storage unavailable
		}
	}

	scrollToSection(event: Event, id: string): void {
		event.preventDefault();
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		this.activeSection.set(id);
	}

	private setupScrollSpy(): void {
		if (typeof IntersectionObserver === 'undefined') {
			return;
		}

		this.sectionObserver?.disconnect();
		this.sectionObserver = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);

				if (visible[0]) {
					this.activeSection.set(visible[0].target.id);
				}
			},
			{ rootMargin: '-15% 0px -70% 0px', threshold: 0 },
		);

		for (const section of this.sections) {
			const element = document.getElementById(section.id);
			if (element) {
				this.sectionObserver.observe(element);
			}
		}
	}

	private fetchGame(attempt = 0): void {
		if (!this.slug) {
			return;
		}

		const slug = this.slug;

		this.catalog
			.get(slug)
			.pipe(catchError(() => of(null as Game | null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((game) => {
				if (slug !== this.slug) {
					return;
				}

				this.game.set(game);
				this.loading.set(false);

				const needsServices =
					!!game &&
					(!game.description ||
						!game.year ||
						game.sources.every((source) => source.id === 'rgg-cat'));

				if (needsServices && attempt < 3) {
					setTimeout(() => this.fetchGame(attempt + 1), 1500);
				}
			});
	}

	readonly platformsLabel = computed(
		() => this.game()?.platforms.map((platform) => platform.name).join(', ') ?? '',
	);

	readonly serviceSources = computed(() =>
		(this.game()?.sources ?? []).filter(
			(source) => source.id !== 'rgg-cat' && source.url.startsWith('https://'),
		),
	);

	tierLabel(tier: GameTier): string {
		return TIER_LABELS[tier];
	}

	hideBroken(event: Event): void {
		const image = event.target as HTMLImageElement;

		image.style.display = 'none';
	}

	initials(title: string): string {
		return title
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0] ?? '')
			.join('')
			.toUpperCase();
	}

	list(value?: string[] | null): string {
		return value?.length ? value.join(', ') : this.i18n.t('gameDetails.noData');
	}

	number(value?: number): string {
		return value === undefined || value === null ? '—' : String(value);
	}
}
