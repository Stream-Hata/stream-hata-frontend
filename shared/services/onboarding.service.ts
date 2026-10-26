import { Injectable, signal } from '@angular/core';

interface OnboardingState {
	completed: boolean;
	choice: number;
	virus: boolean;
}

type TauriInternals = {
	invoke?: <T>(command: string) => Promise<T>;
};

@Injectable({ providedIn: 'root' })
export class OnboardingService {
	readonly virusMode = signal(false);
	readonly virusClosing = signal(false);

	constructor() {
		const initial = (window as unknown as Record<string, unknown>)['__STREAMHATA_VIRUS__'];
		const stored = localStorage.getItem('nsh.virus-mode') === '1';
		const query = new URLSearchParams(location.search).get('virus') === '1';
		const attribute = document.documentElement.getAttribute('data-virus') === '1';
		const title = document.title.includes('очень опасный вирус');

		if (initial === true || stored || query || attribute || title) {
			this.virusMode.set(true);
		}

		void this.load();
	}

	async load(): Promise<void> {
		const state = await this.invoke<OnboardingState>('get_onboarding_state');

		if (state && typeof state.virus === 'boolean') {
			if (state.virus || (!this.virusMode() && state.completed)) {
				this.virusMode.set(state.virus);
			}
		}
	}

	async disableVirusMode(): Promise<void> {
		this.virusClosing.set(true);
		await new Promise((resolve) => setTimeout(resolve, 420));

		void this.invoke('clear_virus_mode');
		(window as unknown as Record<string, unknown>)['__STREAMHATA_VIRUS__'] = false;
		localStorage.setItem('nsh.virus-mode', 'false');
		this.virusMode.set(false);
		this.virusClosing.set(false);

		setTimeout(() => {
			location.href = '/app/restart';
		}, 500);
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
		} catch {
			return null;
		}
	}
}
