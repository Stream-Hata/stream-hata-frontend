import { Component, inject } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';
import { DesktopUpdateService } from '@shared/services/desktop-update.service';

@Component({
	imports: [TuiButton],
	selector: 'app-desktop-update-notice',
	template: `
		@if (update.available()) {
			<aside class="desktop-update" role="alert">
				<div class="desktop-update-text">
					<strong>Доступно обновление StreamHata {{ update.version() }}</strong>
					@if (update.notes()) {
						<span>{{ update.notes() }}</span>
					}
					@if (update.installing()) {
						<span>Скачиваем и устанавливаем обновление…</span>
					}
					@if (update.error()) {
						<span class="desktop-update-error">{{ update.error() }}</span>
					}
				</div>
				<div class="desktop-update-actions">
					<button appearance="primary" size="s" tuiButton type="button" [disabled]="update.installing()" (click)="update.install()">
						Обновить
					</button>
					<button appearance="flat" size="s" tuiButton type="button" [disabled]="update.installing()" (click)="update.dismiss()">
						Позже
					</button>
				</div>
			</aside>
		}
	`,
	styles: `
		.desktop-update {
			position: fixed;
			right: 16px;
			bottom: 88px;
			z-index: 124;
			display: flex;
			gap: 12px;
			flex-direction: column;
			width: min(420px, calc(100vw - 32px));
			padding: 14px 16px;
			border: 1px solid var(--border-strong);
			border-radius: var(--radius-md);
			background: var(--surface-elevated-1);
			box-shadow: 0 16px 40px rgb(0 0 0 / 45%);
		}

		.desktop-update-text {
			display: flex;
			gap: 4px;
			flex-direction: column;
			color: var(--text-secondary);
			font: var(--font-body-sm);
		}

		.desktop-update-text strong {
			color: var(--text-primary);
			font: var(--font-h4);
		}

		.desktop-update-error {
			color: var(--tui-text-negative);
		}

		.desktop-update-actions {
			display: flex;
			gap: 8px;
		}
	`,
})
export class DesktopUpdateNotice {
	readonly update = inject(DesktopUpdateService);
}
