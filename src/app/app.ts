import { Component, inject } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { AppSettingsService } from '@shared/services/app-settings.service';
import { TuiRoot } from '@taiga-ui/core';
import { AppStatus } from './components/ui/app-status/app-status';
import { AppStatusService } from '@shared/services/app-status.service';

@Component({
	imports: [AppStatus, RouterOutlet, TuiRoot],
	selector: 'app-root',
	templateUrl: './app.html',
})
export class App {
	constructor() {
		if (
			typeof window !== 'undefined' &&
			('__TAURI_INTERNALS__' in window || (window as any).__STREAMHATA_DESKTOP__ === true || navigator.userAgent.includes('NamelessStreamHataDesktop'))
		) {
			document.documentElement.dataset['tauri'] = '1';
			const bindSwitch = (input: HTMLInputElement): void => {
				if (input.disabled || input.dataset['tauriBound'] === '1') {
					return;
				}

				input.dataset['tauriBound'] = '1';
				const host = (input.closest('.cfg-row, .admin-switch, label') ?? input.parentElement) as HTMLElement | null;

				if (!host || (host.classList.contains('cfg-row') && !host.classList.contains('integration-row')) || host.querySelector('[data-tauri-switch]') || host.hasAttribute('data-no-tauri-switch')) {
					return;
				}

				host.style.position = 'relative';
				host.style.cursor = 'pointer';

				const overlay = document.createElement('button');
				overlay.type = 'button';
				overlay.tabIndex = -1;
				overlay.dataset['tauriSwitch'] = '1';
				overlay.setAttribute('aria-label', input.getAttribute('aria-label') ?? 'Переключатель');
				overlay.style.cssText = 'position:absolute;inset:0;z-index:9999;border:0;background:transparent;cursor:pointer;opacity:0;';
				overlay.addEventListener('click', (event) => {
					event.preventDefault();
					event.stopPropagation();
					input.checked = !input.checked;
					input.dispatchEvent(new Event('input', { bubbles: true }));
					input.dispatchEvent(new Event('change', { bubbles: true }));
				});
				host.appendChild(overlay);
			};

			const bindSwitches = (): void => {
				document.querySelectorAll<HTMLInputElement>('input[tuiSwitch]').forEach(bindSwitch);
			};

			new MutationObserver(bindSwitches).observe(document.body, { childList: true, subtree: true });
			bindSwitches();
		}

		inject(AppSettingsService);
		const status = inject(AppStatusService);
		const router = inject(Router);

		const hideBootLoader = (): void => {
			const loader = document.getElementById('boot-loader');

			if (!loader) {
				return;
			}

			loader.classList.add('boot-loader-hidden');
			setTimeout(() => loader.remove(), 300);
		};

		router.events.subscribe((event) => {
			if (event instanceof NavigationStart) status.setLoading(true);
			if (event instanceof NavigationEnd || event instanceof NavigationCancel) {
				status.setLoading(false);
				hideBootLoader();
			}
			if (event instanceof NavigationError) {
				status.fail('Не удалось открыть страницу. Проверьте соединение и попробуйте снова.');
				hideBootLoader();
			}
		});
	}
}
