import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppStatusService {
	readonly loading = signal(false);
	readonly error = signal<string | null>(null);

	setLoading(value: boolean): void {
		this.loading.set(value);
	}

	fail(message: string): void {
		this.loading.set(false);
		this.error.set(message);
	}

	clear(): void {
		this.error.set(null);
	}
}
