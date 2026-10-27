import { Component, inject } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';
import { DesktopUpdateService } from '@shared/services/desktop-update.service';

@Component({
	imports: [TuiButton],
	selector: 'app-desktop-update-notice',
	template: `
		@if (update.confirming()) {
			<div class="update-confirm-backdrop">
				<section class="update-confirm" role="dialog" aria-modal="true">
					<strong>Установить обновление {{ update.version() }}?</strong>
					<span>Приложение будет перезапущено.</span>
					<div class="update-confirm-actions">
						<button appearance="primary" size="s" tuiButton type="button" (click)="update.confirm()">Установить</button>
						<button appearance="flat" size="s" tuiButton type="button" (click)="update.cancelConfirm()">Отмена</button>
					</div>
				</section>
			</div>
		}

		@if (update.available()) {
			<aside class="desktop-update" role="alert">
				<div class="desktop-update-text">
					<strong>Доступно обновление StreamHata {{ update.version() }}</strong>
					@if (update.notes()) {
						<span>{{ update.notes() }}</span>
					}
					@if (update.installing()) {
						<span>{{ stepLabel() }} · {{ update.formatBytes(update.downloaded()) }} / {{ update.formatBytes(update.total()) }}</span>
						<div class="update-progress" role="progressbar" [attr.aria-valuenow]="update.progress()" aria-valuemin="0" aria-valuemax="100">
							<span [style.width.%]="update.progress()"></span>
						</div>
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
		.update-progress {
			height: 7px;
			overflow: hidden;
			margin-top: 4px;
			border-radius: 99px;
			background: var(--neutral-1);
		}

		.update-progress span {
			display: block;
			height: 100%;
			border-radius: inherit;
			background: var(--accent-primary);
			transition: width 180ms ease;
		}

		.update-confirm-backdrop {
			position: fixed;
			inset: 0;
			z-index: 160;
			display: grid;
			place-items: center;
			padding: 20px;
			background: rgb(5 3 9 / 72%);
			backdrop-filter: blur(10px);
		}

		.update-confirm {
			display: flex;
			gap: 8px;
			flex-direction: column;
			width: min(420px, 100%);
			padding: 20px;
			border: 1px solid var(--border-normal);
			border-radius: var(--radius-lg);
			background: var(--surface-elevated-1);
			color: var(--text-primary);
			box-shadow: 0 28px 90px rgb(0 0 0 / 55%);
		}

		.update-confirm span {
			color: var(--text-secondary);
			font: var(--font-body-sm);
		}

		.update-confirm-actions {
			display: flex;
			gap: 8px;
			margin-top: 8px;
		}

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
	readonly stepLabel = () => ({
		downloading: 'Скачивание обновления…',
		installing: 'Распаковка и установка…',
		restarting: 'Перезапуск приложения…',
	}[this.update.step()] ?? 'Обновление…');
}
