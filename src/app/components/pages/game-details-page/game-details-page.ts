import type { Game, GameTier } from '@shared/types/game';
import { Component, computed, inject, signal } from '@angular/core';

import { ActivatedRoute, RouterLink } from '@angular/router';
import { imageUrl } from '@shared/helpers/proxy-image';
import { GamesCatalogService } from '@shared/services/games-catalog.service';
import { I18nService } from '@shared/services/i18n.service';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
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
	imports: [RouterLink, TuiBadge, TuiButton, TuiIcon],
	selector: 'app-game-details-page',
	styleUrl: './game-details-page.scss',
	templateUrl: './game-details-page.html',
})
export default class GameDetailsPage {
	protected readonly imageUrl = imageUrl;
	private readonly route = inject(ActivatedRoute);
	private readonly catalog = inject(GamesCatalogService);
	readonly i18n = inject(I18nService);

	readonly genres = computed(() => {
		const game = this.game();

		return game?.genresRu?.length ? game.genresRu : (game?.genres ?? []);
	});

	readonly description = computed(() => {
		const game = this.game();
		if (!game) return '';
		return this.i18n.language() === 'ru' ? (game.descriptionRu || game.description || '') : (game.description || '');
	});
	readonly game = signal<Game | null>(null);
	readonly loading = signal(false);
	readonly desktop = navigator.userAgent.includes('NamelessStreamHataDesktop') || '__TAURI_INTERNALS__' in window;
	private slug = '';

	constructor() {
		const preload = this.route.snapshot.data['game'] as Game | null;

		if (preload) {
			this.game.set(preload);
		}

		this.route.paramMap.subscribe((params) => {
			this.slug = params.get('slug') ?? '';
			this.fetchGame();
		});
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
		this.catalog.get(this.slug, true).pipe(catchError(() => of(null as Game | null))).subscribe((game) => {
			this.game.set(game);
			this.loading.set(false);
		});
	}

	private fetchGame(attempt = 0): void {
		if (!this.slug) {
			return;
		}

		const slug = this.slug;

		this.catalog
			.get(slug)
			.pipe(catchError(() => of(null as Game | null)))
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
		return value?.length ? value.join(', ') : 'Нет данных';
	}

	number(value?: number): string {
		return value === undefined || value === null ? '—' : String(value);
	}
}
