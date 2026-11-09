import type { ElementRef } from '@angular/core';
import type { FaqImage } from './faq.data';
import {
	Component,
	computed,
	DestroyRef,
	HostListener,
	inject,
	signal,
	viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { VoiceSearchService } from '@shared/services/voice-search.service';
import { TuiButton, TuiIcon, TuiInput, TuiLink, TuiTextfield } from '@taiga-ui/core';
import { Logo } from '../../ui/logo/logo';
import { FAQ_CATEGORIES, FAQ_ITEMS } from './faq.data';

@Component({
	imports: [RouterLink, TuiButton, TuiIcon, TuiInput, TuiLink, TuiTextfield, Logo],
	selector: 'app-faq-page',
	styleUrl: './faq-page.scss',
	templateUrl: './faq-page.html',
})
export default class FaqPage {
	readonly categories = FAQ_CATEGORIES;
	readonly items = FAQ_ITEMS;
	readonly categoryImages: Record<string, FaqImage> = {
		start: {
			src: '/help/dashboard.webp',
			alt: 'Дашборд панели',
			caption: 'Дашборд: состояние канала и быстрые действия.',
		},
		features: {
			src: '/help/widgets.webp',
			alt: 'Раздел виджетов',
			caption: 'Виджеты и разделы панели в одном окне.',
		},
		twitch: {
			src: '/help/login.webp',
			alt: 'Страница входа через Twitch',
			caption: 'Вход через Twitch и запрос разрешений.',
		},
		auth: {
			src: '/help/login.webp',
			alt: 'Страница входа через Twitch',
			caption: 'Авторизация и разрешения Twitch.',
		},
		desktop: {
			src: '/help/landing.webp',
			alt: 'Главная страница проекта',
			caption: 'Публичная часть останется в браузере; панель переедет в desktop.',
		},
		games: {
			src: '/help/games.webp',
			alt: 'Каталог игр',
			caption: 'Каталог игр: поиск, фильтры и карточки.',
		},
		hotbar: {
			src: '/help/hotbar.webp',
			alt: 'Настройка хотбара',
			caption: 'Хотбар: платформы и превью для OBS.',
		},
		roulette: {
			src: '/help/roulette.webp',
			alt: 'Рулетка игр',
			caption: 'Рулетка и колесо: режимы, пул и история.',
		},
		points: {
			src: '/help/points.webp',
			alt: 'Страница баллов',
			caption: 'Баллы: лидерборд, начисления и награды.',
		},
		chat: {
			src: '/help/jury.webp',
			alt: 'Страница чат-жюри',
			caption: 'Чат-жюри, команды и модерация чата.',
		},
		widgets: {
			src: '/help/widgets.webp',
			alt: 'Страница виджетов',
			caption: 'Виджеты и OBS-оверлеи.',
		},
		music: {
			src: '/help/music.webp',
			alt: 'Страница музыки',
			caption: 'Музыка: очередь треков и метаданные.',
		},
		donations: {
			src: '/help/donations.webp',
			alt: 'Страница донатов',
			caption: 'Донаты: провайдер, лента и цель.',
		},
		steam: {
			src: '/help/profile.webp',
			alt: 'Профиль Steam',
			caption: 'Профиль: привязка Steam и библиотека.',
		},
		profile: {
			src: '/help/profile.webp',
			alt: 'Профиль пользователя',
			caption: 'Профиль, роли и статистика.',
		},
		problems: {
			src: '/help/settings.webp',
			alt: 'Настройки приложения',
			caption: 'Настройки и диагностика проблем.',
		},
		privacy: {
			src: '/help/login.webp',
			alt: 'Авторизация и данные',
			caption: 'Данные и безопасность аккаунта.',
		},
	};

	private readonly voice = inject(VoiceSearchService);
	readonly query = signal('');
	readonly voiceError = signal('');
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);
	readonly category = signal('all');
	readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

	readonly filtered = computed(() => {
		const query = normalize(this.query());
		const category = this.category();

		return this.items.filter((item) => {
			if (category !== 'all' && item.category !== category) {
				return false;
			}

			if (!query) {
				return true;
			}

			const haystack = normalize(
				[item.question, item.keywords ?? '', ...item.paragraphs, ...(item.steps ?? [])].join(' '),
			);

			return haystack.includes(query);
		});
	});

	readonly categoryCounts = computed(() => {
		const counts = new Map<string, number>();

		for (const item of this.items) {
			counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
		}

		return counts;
	});

	constructor() {
		this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
			const query = params.get('q');
			const category = params.get('category');

			if (query) {
				this.query.set(query);
			}
			if (category) {
				this.category.set(category);
			}
		});
	}

	@HostListener('document:keydown', ['$event'])
	onKeydown(event: KeyboardEvent): void {
		const hotkey =
			(event.ctrlKey && event.key.toLowerCase() === 'f') ||
			(event.altKey && event.key.toLowerCase() === 'k');

		if (!hotkey) {
			return;
		}

		event.preventDefault();
		this.searchInput()?.nativeElement.focus();
	}

	startVoice(event: MouseEvent): void {
		event.preventDefault();
		this.voiceError.set('');
		this.voice.start().subscribe({
			next: (text) => {
				this.query.set(text);
				if (normalize(text).includes('десктоп') || normalize(text).includes('приложен')) {
					this.category.set('desktop');
				}
			},
			error: (error) => this.voiceError.set(error instanceof Error ? error.message : String(error)),
		});
	}

	setCategory(id: string): void {
		this.category.set(id);
	}

	openQuestion(id: string): void {
		const element = document.getElementById(`faq-${id}`) as HTMLDetailsElement | null;

		if (element) {
			element.open = true;
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	categoryTitle(id: string): string {
		return this.categories.find((category) => category.id === id)?.title ?? '';
	}
}

function normalize(value: string): string {
	return value.trim().toLowerCase().replaceAll('ё', 'е');
}
