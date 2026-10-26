import { ErrorHandler, Injectable, inject } from '@angular/core';
import { AppStatusService } from '@shared/services/app-status.service';

@Injectable()
export class AppErrorHandler implements ErrorHandler {
	private readonly status = inject(AppStatusService);

	handleError(error: unknown): void {
		console.error(error);
		this.status.fail('Что-то пошло не так. Попробуйте обновить приложение.');
	}
}
