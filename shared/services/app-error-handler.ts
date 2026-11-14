import type { ErrorHandler } from '@angular/core';
import { inject, Injectable } from '@angular/core';
import { AppStatusService } from '@shared/services/app-status.service';

const RELOAD_KEY = 'nsh.chunk-reload-at';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
	private readonly status = inject(AppStatusService);

	handleError(error: unknown): void {
		console.error(error);
		const message = String((error as { message?: string })?.message ?? error);
		if (/chunk|dynamically imported module|importing a module script failed/i.test(message)) {
			try {
				const previous = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
				if (Date.now() - previous > 30_000) {
					sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
					location.reload();

					return;
				}
			} catch {
				// storage unavailable
			}
		}
		this.status.fail('Что-то пошло не так. Попробуйте обновить приложение.');
	}
}
