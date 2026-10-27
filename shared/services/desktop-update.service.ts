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
	readonly downloaded = signal(0);
	readonly total = signal(0);
	readonly step = signal('');
	readonly error = signal('');
	private readonly tauri = this.isTauri();

	constructor() {
		if (!this.tauri) {
			return;
		}

		void this.loadVersion();
		void this.check();
		this.listenForUpdates();
		this.listenForProgress();
		void this.syncState();
		setInterval(() => void this.check(), 30 * 60_000);
	}

	private applyState(state: {
		phase?: string;
		version?: string | null;
		downloaded?: number;
		total?: number;
		error?: string | null;
	}): void {
		switch (state.phase) {
			case 'checking':
				this.checking.set(true);
				break;
			case 'available':
				this.checking.set(false);
				this.checked.set(true);
				this.available.set(true);
				if (state.version) this.version.set(state.version);
				break;
			case 'idle':
				this.checking.set(false);
				this.checked.set(true);
				this.available.set(false);
				break;
			case 'downloading':
				this.checking.set(false);
				this.available.set(true);
				this.installing.set(true);
				this.step.set('downloading');
				break;
			case 'installing':
				this.available.set(true);
				this.installing.set(true);
				this.step.set('installing');
				break;
			case 'restarting':
				this.available.set(true);
				this.installing.set(true);
				this.step.set('restarting');
				break;
			case 'error':
				this.checking.set(false);
				this.available.set(true);
				this.installing.set(false);
				this.error.set(state.error ?? 'Ошибка обновления');
				break;
		}
	}

	async syncState(): Promise<void> {
		const state = await this.invoke<Parameters<DesktopUpdateService['applyState']>[0]>(
			'update_ui_state',
			true,
		);

		if (state) {
			this.applyState(state);
		}
	}

	private listenForProgress(): void {
		const globalTauri = (window as unknown as Record<string, unknown>)['__TAURI__'] as
			| {
					event?: {
						listen?: (event: string, handler: (event: { payload: unknown }) => void) => Promise<unknown>;
					};
			  }
			| undefined;

		void globalTauri?.event?.listen?.('update-progress', (event) => {
			const [downloaded, total] = event.payload as [number, number | null];
			this.downloaded.set(downloaded);
			this.total.set(total ?? 0);
			this.progress.set(total ? Math.min(100, Math.round((downloaded / total) * 100)) : 0);
		});
		void globalTauri?.event?.listen?.('update-state', (event) => {
			this.applyState(event.payload as Parameters<DesktopUpdateService['applyState']>[0]);
		});
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
		this.progress.set(0);
		this.downloaded.set(0);
		this.total.set(0);
		this.step.set('downloading');

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

	formatBytes(value: number): string {
		if (!value) {
			return '0 B';
		}

		const units = ['B', 'KB', 'MB', 'GB'];
		const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));

		return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
	}

	private isTauri(): boolean {
		return (
			typeof window !== 'undefined' &&
			('__TAURI_INTERNALS__' in window || navigator.userAgent.includes('NamelessStreamHataDesktop'))
		);
	}

	private async invoke<T = unknown>(command: string, silent = false): Promise<T | null> {
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
			if (!silent) {
				this.error.set(String(error));
			}

			return null;
		}
	}
}
