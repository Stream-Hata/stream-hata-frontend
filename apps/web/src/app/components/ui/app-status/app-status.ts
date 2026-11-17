import { Component, inject } from '@angular/core';
import { AppStatusService } from '@shared/services/app-status.service';
import { TuiButton, TuiIcon } from '@taiga-ui/core';

@Component({
	imports: [TuiButton, TuiIcon],
	selector: 'app-app-status',
	styleUrl: './app-status.scss',
	templateUrl: './app-status.html',
})
export class AppStatus {
	readonly status = inject(AppStatusService);

	reload(): void {
		location.reload();
	}
}
