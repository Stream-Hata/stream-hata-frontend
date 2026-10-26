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
	readonly available = signal(false);
	readonly version = signal('');
	readonly notes = signal('');
	readonly installing = signal(false);
	readonly progress = signal(0);
	readonly error = signal('');
	private readonly tauri = this.isTauri();

	constructor() {
		if (!this.tauri) {
			return;
		}

		void this.check();
		setInterval(() => void this.check(), 30 * 60_000);
	}

	async check(): Promise<void> {
		const result = await this.invoke<UpdateInfo | null>('check_update');

		if (!result) {
			return;
		}

		this.version.set(result.version);
		this.notes.set(result.notes ?? '');
		this.available.set(true);
	}

	async install(): Promise<void> {
		if (this.installing()) {
			return;
		}

		this.installing.set(true);
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
