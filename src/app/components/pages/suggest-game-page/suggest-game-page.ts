import type { GameSuggestion } from '@shared/services/suggestions.service';
import type { TwitchResponse } from '@shared/services/twitch.service';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SuggestionsService } from '@shared/services/suggestions.service';
import { TwitchService } from '@shared/services/twitch.service';
import {
	TuiButton,
	TuiDropdown,
	TuiIcon,
	TuiInput,
	TuiLink,
	TuiSelectLike,
	TuiTextfield,
} from '@taiga-ui/core';
import {
	TuiBadge,
	TuiChevron,
	TuiDataListWrapper,
	TuiInputNumber,
	TuiMultiSelect,
	TuiSwitch,
} from '@taiga-ui/kit';
import { catchError, of, switchMap, timer } from 'rxjs';
import { Logo } from '../../ui/logo/logo';

const PLATFORMS = ['PC', 'PlayStation', 'Xbox', 'Nintendo', 'Ретро-консоль', 'Другой'];

@Component({
	imports: [
		ReactiveFormsModule,
		RouterLink,
		TuiBadge,
		TuiButton,
		TuiChevron,
		TuiDataListWrapper,
		TuiDropdown,
		TuiIcon,
		TuiInput,
		TuiInputNumber,
		TuiLink,
		TuiSelectLike,
		TuiSwitch,
		TuiTextfield,
		Logo,
	],
	selector: 'app-suggest-game-page',
	styleUrl: './suggest-game-page.scss',
	templateUrl: './suggest-game-page.html',
})
export default class SuggestGamePage {
	private readonly suggestions = inject(SuggestionsService);
	private readonly twitchService = inject(TwitchService);

	readonly platforms = PLATFORMS;
	readonly services = ['RGG / cat.txt', 'Steam', 'IGDB', 'RAWG', 'MobyGames'];
	readonly serviceIds: Record<string, string> = {
		'RGG / cat.txt': 'rgg',
		Steam: 'steam',
		IGDB: 'igdb',
		RAWG: 'rawg',
		MobyGames: 'mobygames',
	};
	readonly autoSearchControl = new FormControl(true, { nonNullable: true });
	readonly autoSearch = signal(true);
	readonly selectedServices = signal<string[]>(['RGG / cat.txt']);
	readonly servicesOpen = signal(false);
	readonly servicesLabel = computed(() => this.selectedServices().join(', '));
	readonly submitting = signal(false);
	readonly submitted = signal(false);
	readonly error = signal('');
	readonly mine = signal<GameSuggestion[]>([]);
	private mineRequested = false;

	readonly form = new FormGroup({
		title: new FormControl('', {
			nonNullable: true,
			validators: [Validators.required, Validators.minLength(2), Validators.maxLength(160)],
		}),
		platform: new FormControl('PC', { nonNullable: true }),
		year: new FormControl(0, { nonNullable: true }),
		links: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1200)] }),
		comment: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
		coverUrl: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
		screenshots: new FormControl('', {
			nonNullable: true,
			validators: [Validators.maxLength(6000)],
		}),
		description: new FormControl('', {
			nonNullable: true,
			validators: [Validators.maxLength(5000)],
		}),
		genres: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(300)] }),
		developer: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(300)] }),
		publisher: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(300)] }),
		website: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
	});

	readonly profile = toSignal(
		timer(0, 30000).pipe(
			switchMap(() =>
				this.twitchService.login().pipe(catchError(() => of(null as TwitchResponse | null))),
			),
		),
		{ initialValue: null as TwitchResponse | null },
	);

	readonly loggedIn = computed(() => Boolean(this.profile()?.valid));
	readonly nickname = computed(() => this.profile()?.user?.username ?? '');
	readonly displayName = computed(() => this.profile()?.user?.displayName ?? this.nickname());

	constructor() {
		this.autoSearchControl.valueChanges.subscribe((enabled) => this.setAutoSearch(enabled));

		effect(() => {
			if (this.loggedIn() && !this.mineRequested) {
				this.loadMine();
			}
		});
	}

	setAutoSearch(enabled: boolean): void {
		this.autoSearch.set(enabled);

		if (!enabled) {
			this.selectedServices.set([]);
		} else if (!this.selectedServices().length) {
			this.selectedServices.set(['RGG / cat.txt']);
		}
	}

	toggleService(service: string): void {
		this.selectedServices.update((list) =>
			list.includes(service) ? list.filter((item) => item !== service) : [...list, service],
		);
		this.servicesOpen.set(true);
	}

	login(): void {
		this.twitchService.connect(`${location.origin}/suggest-game`);
	}

	submit(): void {
		if (this.form.invalid || this.submitting()) {
			this.form.markAllAsTouched();

			return;
		}

		this.error.set('');

		if (this.autoSearch() && !this.selectedServices().length) {
			this.error.set('Выберите хотя бы один сервис для автоматического поиска.');

			return;
		}

		this.submitting.set(true);

		const value = this.form.getRawValue();
		const manual = !this.autoSearch();

		this.suggestions
			.create({
				title: value.title.trim(),
				platform: manual ? value.platform : '',
				year: Number(value.year) || 0,
				links: manual ? value.links.trim() : '',
				comment: manual ? value.comment.trim() : '',
				coverUrl: manual ? value.coverUrl.trim() : '',
				screenshots: manual ? value.screenshots.trim() : '',
				description: manual ? value.description.trim() : '',
				genres: manual ? value.genres.trim() : '',
				developer: manual ? value.developer.trim() : '',
				publisher: manual ? value.publisher.trim() : '',
				website: manual ? value.website.trim() : '',
				services: this.autoSearch()
					? this.selectedServices().map((service) => this.serviceIds[service])
					: [],
			})
			.subscribe({
				next: () => {
					this.submitted.set(true);
					this.form.patchValue({
						title: '',
						year: 0,
						links: '',
						comment: '',
						coverUrl: '',
						screenshots: '',
						description: '',
						genres: '',
						developer: '',
						publisher: '',
						website: '',
					});
					this.selectedServices.set(['RGG / cat.txt']);
					this.loadMine();
				},
				error: (error: { error?: { error?: string } }) => {
					this.error.set(error?.error?.error || 'Не удалось отправить заявку. Попробуйте ещё раз.');
				},
				complete: () => this.submitting.set(false),
			});
	}

	statusLabel(status: GameSuggestion['status']): string {
		return status === 'approved' ? 'Одобрена' : status === 'rejected' ? 'Отклонена' : 'На проверке';
	}

	statusAppearance(status: GameSuggestion['status']): string {
		return status === 'approved' ? 'positive' : status === 'rejected' ? 'negative' : 'warning';
	}

	private loadMine(): void {
		this.mineRequested = true;
		this.suggestions.mine().subscribe({
			next: (response) => this.mine.set(response.items),
			error: () => this.mine.set([]),
		});
	}
}
