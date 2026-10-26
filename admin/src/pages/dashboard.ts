import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { GamesCatalogService } from '@shared/services/games-catalog.service';
import { RouterLink } from '@angular/router';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { catchError, of } from 'rxjs';

@Component({
	imports: [RouterLink, TuiBadge, TuiButton, TuiIcon],
	selector: 'app-admin-dashboard',
	template: `
		<div class="admin-page">
			<header class="admin-page-head">
				<div>
					<h1>Обзор</h1>
					<p class="jk-caption">Состояние каталога, импорта и источников данных.</p>
				</div>
				<span appearance="info" tuiBadge>StreamHata admin</span>
			</header>

			<div class="admin-grid">
				<section class="admin-metric">
					<div class="admin-metric-head"><tui-icon icon="@tui.gamepad-2" /> Игры в базе</div>
					<strong class="admin-metric-value">{{ status()?.total ?? 0 }}</strong>
					<span class="jk-caption">Всего карточек в catalog_game</span>
				</section>

				<section class="admin-metric">
					<div class="admin-metric-head"><tui-icon icon="@tui.database" /> Источники импорта</div>
					<strong class="admin-metric-value">{{ status()?.sources || '—' }}</strong>
					<span class="jk-caption">Подключённые провайдеры</span>
				</section>

				<section class="admin-metric">
					<div class="admin-metric-head"><tui-icon icon="@tui.gauge" /> RAWG квота</div>
					<strong class="admin-metric-value">
						{{ status()?.rawg?.quota?.count ?? 0 }} / {{ status()?.rawg?.quota?.limit ?? 0 }}
					</strong>
					@if (status()?.rawg?.quota?.pausedUntil) {
						<span class="jk-caption">Пауза до {{ status()?.rawg?.quota?.pausedUntil }}</span>
					} @else {
						<span class="jk-caption">Месячный лимит запросов</span>
					}
				</section>

				<section class="admin-metric">
					<div class="admin-metric-head"><tui-icon icon="@tui.list-ordered" /> IGDB курсор</div>
					<strong class="admin-metric-value">offset {{ status()?.igdb?.cursor?.offset ?? 0 }}</strong>
					<span class="jk-caption">Текущая позиция импорта</span>
				</section>
			</div>

			<section class="admin-card">
				<div class="admin-card-head">
					<h2>Быстрые действия</h2>
				</div>
				<div class="admin-table-actions">
					<a appearance="primary" href="https://streamhata.rdpctd.dev/app/dashboard" target="_blank" rel="noopener" tuiButton>
						Открыть основное приложение
					</a>
					<a appearance="flat" routerLink="/imports" tuiButton>Перейти к импорту</a>
					<a appearance="flat" routerLink="/games" tuiButton>Открыть каталог</a>
				</div>
			</section>
		</div>
	`,
})
export class DashboardPage {
	private readonly catalog = inject(GamesCatalogService);
	readonly status = toSignal(this.catalog.importStatus().pipe(catchError(() => of(null))), {
		initialValue: null,
	});
}
