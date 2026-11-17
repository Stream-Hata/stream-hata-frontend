import type { MarketplaceAdminPlugin } from '@shared/services/marketplace.service';
import { Component, inject, signal } from '@angular/core';
import { MarketplaceService } from '@shared/services/marketplace.service';
import { TuiButton } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';

@Component({
	imports: [TuiBadge, TuiButton],
	selector: 'app-admin-plugins',
	template: `
		<div class="admin-page">
			<header class="admin-page-head">
				<div>
					<h1>Плагины и моды</h1>
					<p class="jk-caption">Модерация манифестов и артефактов marketplace.</p>
				</div>
				<button appearance="flat" type="button" tuiButton (click)="load()">Обновить</button>
			</header>

			@if (error()) {
				<p class="admin-error" role="alert">{{ error() }}</p>
			}
			@if (loading()) {
				<div class="admin-card jk-empty">Загружаем заявки…</div>
			} @else {
				<div class="admin-grid">
					@for (item of items(); track item.slug) {
						<section class="admin-card">
							<div class="admin-card-head">
								<div>
									<h2>{{ item.name }}</h2>
									<span class="jk-caption">{{ item.slug }} · {{ item.kind }} · {{ item.status }}</span>
								</div>
								<span appearance="info" tuiBadge>{{ item.latestVersion || 'без версии' }}</span>
							</div>
							<p class="jk-body-sm">{{ item.summary || 'Без описания.' }}</p>
							<p class="jk-caption">publisher: {{ item.publisherSlug }} · {{ item.permissions.join(', ') || 'без разрешений' }}</p>
							@if (item.artifactUrl) {
								<a
									class="jk-caption"
									[href]="item.artifactUrl"
									target="_blank"
									rel="noopener"
								>
									{{ item.artifactUrl }}
								</a>
							}
							@if (item.artifactSha256) {
								<code class="jk-caption">{{ item.artifactSha256 }}</code>
							}
							<div class="admin-table-actions">
								@if (item.status !== 'published') {
									<button appearance="primary" type="button" tuiButton (click)="setStatus(item, 'published')">
										Опубликовать
									</button>
								}
								@if (item.status !== 'rejected') {
									<button appearance="flat" type="button" tuiButton (click)="setStatus(item, 'rejected')">
										Отклонить
									</button>
								}
								@if (item.status !== 'blocked') {
									<button appearance="flat" type="button" tuiButton (click)="setStatus(item, 'blocked')">
										Заблокировать
									</button>
								}
							</div>
						</section>
					} @empty {
						<div class="admin-card jk-empty">Заявок пока нет.</div>
					}
				</div>
			}
		</div>
	`,
})
export class PluginsAdminPage {
	readonly items = signal<MarketplaceAdminPlugin[]>([]);
	readonly loading = signal(true);
	readonly error = signal('');

	private readonly marketplace = inject(MarketplaceService);

	constructor() {
		this.load();
	}

	load(): void {
		this.loading.set(true);
		this.error.set('');
		this.marketplace.adminList().subscribe({
			next: ({ items }) => {
				this.items.set(items);
				this.loading.set(false);
			},
			error: () => {
				this.error.set('Не удалось загрузить заявки marketplace.');
				this.loading.set(false);
			},
		});
	}

	setStatus(item: MarketplaceAdminPlugin, status: 'published' | 'rejected' | 'blocked'): void {
		this.marketplace.setStatus(item.slug, { version: item.latestVersion || undefined, status }).subscribe({
			next: () => this.load(),
			error: () => this.error.set('Не удалось изменить статус.'),
		});
	}
}
