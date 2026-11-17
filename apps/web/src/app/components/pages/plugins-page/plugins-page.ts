import type { MarketplacePlugin } from '@shared/services/marketplace.service';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MarketplaceService } from '@shared/services/marketplace.service';
import { TuiButton } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { catchError, debounceTime, distinctUntilChanged, of, Subject, switchMap } from 'rxjs';

@Component({
	imports: [TuiBadge, TuiButton],
	selector: 'app-plugins-page',
	styleUrl: './plugins-page.scss',
	templateUrl: './plugins-page.html',
})
export default class PluginsPage {
	readonly items = signal<MarketplacePlugin[]>([]);
	readonly query = signal('');
	readonly loading = signal(true);
	readonly error = signal('');

	readonly published = computed(() => this.items().filter((item) => item.status === 'published'));
	readonly search$ = new Subject<string>();
	private readonly marketplace = inject(MarketplaceService);
	private readonly destroyRef = inject(DestroyRef);

	constructor() {
		this.search$
			.pipe(
				debounceTime(250),
				distinctUntilChanged(),
				switchMap((query) =>
					this.marketplace.list(query).pipe(catchError(() => of({ items: [] }))),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(({ items }) => {
				this.items.set(items);
				this.loading.set(false);
			});
		this.load('');
	}

	onSearch(event: Event): void {
		const query = (event.target as HTMLInputElement).value;
		this.query.set(query);
		this.loading.set(true);
		this.error.set('');
		this.search$.next(query);
	}

	load(query: string): void {
		this.loading.set(true);
		this.error.set('');
		this.marketplace
			.list(query)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ items }) => {
					this.items.set(items);
					this.loading.set(false);
				},
				error: () => {
					this.loading.set(false);
					this.error.set('Не удалось загрузить каталог плагинов.');
				},
			});
	}

	permissionLabel(permission: string): string {
		const labels: Record<string, string> = {
			'network': 'Сеть',
			'filesystem.read': 'Чтение файлов',
			'filesystem.write': 'Запись файлов',
			'clipboard.read': 'Буфер обмена',
			'clipboard.write': 'Буфер обмена',
			'notifications': 'Уведомления',
			'obs': 'OBS',
			'twitch.chat': 'Twitch-чат',
			'stream.state': 'Состояние стрима',
			'commands': 'Команды',
			'ui.panel': 'UI-панель',
			'storage': 'Хранилище',
		};

		return labels[permission] ?? permission;
	}
}
