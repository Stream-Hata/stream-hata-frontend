import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { timer } from 'rxjs';
import { catchError, of } from 'rxjs';

interface VersionPayload {
	version: string;
	build: string;
	notes?: string[];
}

@Injectable({ providedIn: 'root' })
export class UpdateService {
	private readonly http = inject(HttpClient);
	private readonly document = inject(DOCUMENT);
	private current = '';
	readonly available = signal(false);
	readonly build = signal('');
	readonly version = signal('');
	readonly notes = signal<string[]>([]);
	readonly whatsNew = signal(false);

	constructor() {
		this.registerWorker();
		this.document.defaultView?.navigator.serviceWorker?.addEventListener('message', (event) => {
			if (event.data?.type === 'APP_VERSION') {
				this.checkVersion();
			}
		});

		timer(0, 60_000).subscribe(() => this.checkVersion());
	}

	markChangelogSeen(): void {
		localStorage.setItem('nsh.whats-new-version-v2', this.version());
		this.whatsNew.set(false);
	}



	reload(): void {
		const current = this.build() || this.current;

		if (current) {
			localStorage.setItem('nsh.build', current);
		}

		this.available.set(false);
		this.whatsNew.set(false);
		location.reload();
	}

	private checkVersion(): void {
		this.http
			.get<VersionPayload>(`version.json?t=${Date.now()}`)
			.pipe(catchError(() => of(null)))
			.subscribe((payload) => {
				if (payload?.build) {
					this.handlePayload(payload);
				}
			});
	}

	private handlePayload(payload: VersionPayload): void {
		if (!this.current) {
			const previousBuild = localStorage.getItem('nsh.build');

			this.current = payload.build;
			this.version.set(payload.version);
			this.notes.set(payload.notes ?? []);
			this.available.set(previousBuild !== payload.build);
			this.whatsNew.set(localStorage.getItem('nsh.whats-new-version-v2') !== payload.version);

			localStorage.setItem('nsh.build', payload.build);

			return;
		}

		if (payload.build !== this.current) {
			this.build.set(payload.build);
			localStorage.setItem('nsh.build', payload.build);
			this.version.set(payload.version);
			this.notes.set(payload.notes ?? []);
			this.whatsNew.set(localStorage.getItem('nsh.whats-new-version-v2') !== payload.version);
			this.available.set(true);
		}
	}

	private registerWorker(): void {
		const navigatorRef = this.document.defaultView?.navigator;

		if (!navigatorRef?.serviceWorker) {
			return;
		}

		void navigatorRef.serviceWorker
			.register('/sw.js')
			.then((registration) => {
				const check = () => {
					registration.active?.postMessage({ type: 'CHECK_VERSION' });
					registration.waiting?.postMessage({ type: 'CHECK_VERSION' });
				};

				check();
				setInterval(check, 60_000);
			})
			.catch(() => undefined);
	}
}
