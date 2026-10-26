import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';

@Component({
	selector: 'app-system-page',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="system-page">
			<span class="spinner"></span>
			<p>Открываю системное окно…</p>
		</div>
	`,
	styles: `
		.spinner {
			width: 32px;
			height: 32px;
			border: 3px solid color-mix(in srgb, var(--tui-text-secondary) 30%, transparent);
			border-top-color: var(--tui-background-accent-1);
			border-radius: 50%;
			animation: spin 0.8s linear infinite;
		}

		@keyframes spin {
			to {
				transform: rotate(360deg);
			}
		}

		.system-page {
			display: grid;
			place-items: center;
			gap: 12px;
			min-height: 60vh;
			color: var(--tui-text-secondary);
		}
	`,
})
export class SystemPage implements OnInit {
	ngOnInit(): void {
		const internals = (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] as
			| { invoke?: (command: string) => Promise<unknown> }
			| undefined;

		if (internals?.invoke) {
			void internals.invoke('open_system_window').finally(() => history.back());
		} else {
			location.replace('/app');
		}
	}
}
