import { Injectable } from '@angular/core';

export interface AccountInfo {
	login: string;
	displayName: string;
	active: boolean;
}

type Invoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

@Injectable({ providedIn: 'root' })
export class AccountsService {
	private readonly invoke = (
		window as unknown as { __TAURI_INTERNALS__?: { invoke?: Invoke } }
	).__TAURI_INTERNALS__?.invoke;

	async list(): Promise<AccountInfo[]> {
		if (!this.invoke) {
			return [];
		}

		return (await this.invoke('list_accounts')) as AccountInfo[];
	}

	async saveCurrent(login: string, displayName: string): Promise<void> {
		await this.invoke?.('save_current_account', { login, displayName });
	}

	async switch(login: string): Promise<void> {
		await this.invoke?.('switch_account', { login });
	}

	async remove(login: string): Promise<void> {
		await this.invoke?.('remove_account', { login });
	}
}
