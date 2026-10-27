import { Injectable, signal } from '@angular/core';

interface UpdateInfo {
	version: string;
	notes?: string;
	date?: string;
}

interface TauriInternals {
	invoke?: <T>(command: string) => Promise<T>;
}

@Injectable({ providedIn: 'root' })
export class DesktopUpdateService {
	readonly currentVersion = signal('');
	readonly available = signal(false);
	readonly version = signal('');
	readonly notes = signal('');
	readonly checking = signal(false);
	readonly checked = signal(false);
	readonly confirming = signal(false);
	readonly installing = signal(false);
	readonly progress = signal(0);
	readonly error = signal('');
	private readonly tauri = this.isTauri();

	constructor() {
		if (!this.tauri) {
			return;
		}

		void this.loadVersion();
		void this.check();
		this.listenForUpdates();
		setInterval(() => void this.check(), 30 * 60_000);
	}

	private listenForUpdates(): void {
		const globalTauri = (window as unknown as Record<string, unknown>)['__TAURI__'] as
			| { event?: { listen?: (event: string, handler: () => void) => Promise<unknown> } }
			| undefined;

		void globalTauri?.event?.listen?.('update-available', () => void this.check());
	}

	async loadVersion(): Promise<void> {
		const version = await this.invoke<string>('app_version');

		if (version) {
			this.currentVersion.set(version);
		}
	}

	async check(manual = false): Promise<void> {
		if (this.checking()) {
			return;
		}

		this.checking.set(true);
		this.checked.set(false);
		this.error.set('');
		const result = await this.invoke<UpdateInfo | null>(manual ? 'check_update_manual' : 'check_update');

		this.checking.set(false);
		this.checked.set(true);

		if (!result) {
			return;
		}

		this.version.set(result.version);
		this.notes.set(result.notes ?? '');
		this.available.set(true);

		if (manual) {
			this.confirming.set(true);
		}
	}

	confirm(): void {
		this.confirming.set(false);
		void this.install();
	}

	cancelConfirm(): void {
		this.confirming.set(false);
	}

	async install(): Promise<void> {
		if (this.installing()) {
			return;
		}

		this.installing.set(true);
		this.confirming.set(false);
		this.error.set('');

		try {
			await this.invoke('install_update');
		} catch (error) {
			this.installing.set(false);
			this.error.set(String(error));
		}
	}

	dismiss(): void {
		this.available.set(false);
	}

	private isTauri(): boolean {
		return (
			typeof window !== 'undefined' &&
			('__TAURI_INTERNALS__' in window || navigator.userAgent.includes('NamelessStreamHataDesktop'))
		);
	}

	private async invoke<T = unknown>(command: string): Promise<T | null> {
		const internals = (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] as
			| TauriInternals
			| undefined;
		const globalTauri = (window as unknown as Record<string, unknown>)['__TAURI__'] as
			| { core?: TauriInternals }
			| undefined;
		const invoke = internals?.invoke ?? globalTauri?.core?.invoke;

		if (!invoke) {
			return null;
		}

		try {
			return await invoke<T>(command);
		} catch (error) {
			this.error.set(String(error));

			return null;
		}
	}
}
