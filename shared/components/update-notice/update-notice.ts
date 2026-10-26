import { Component, inject, signal } from '@angular/core';
import { UpdateService } from '@shared/services/update.service';

@Component({
	selector: 'app-update-notice',
	styleUrl: './update-notice.scss',
	templateUrl: './update-notice.html',
})
export class UpdateNotice {
	private readonly updates = inject(UpdateService);
	readonly dismissed = signal(false);
	readonly available = this.updates.available;
	readonly version = this.updates.version;
	readonly notes = this.updates.notes;
	readonly whatsNew = this.updates.whatsNew;

	dismiss(): void {
		this.dismissed.set(true);
	}


	reload(): void {
		this.updates.reload();
	}
}
