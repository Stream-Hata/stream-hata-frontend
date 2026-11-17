import type { MessagingContact } from '@shared/types/messaging';

const STORAGE_KEY = 'nsh.dialog-state';

type StoredDialogState = Record<string, { pinned?: boolean; archived?: boolean }>;

export function applyDialogState(items: MessagingContact[]): MessagingContact[] {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as StoredDialogState;

		return items.map((item) => ({ ...item, ...stored[item.login] }));
	} catch {
		return items;
	}
}

export function persistDialogState(
	login: string,
	key: 'pinned' | 'archived',
	value: boolean,
): void {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as StoredDialogState;
		stored[login] = { ...stored[login], [key]: value };
		localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
	} catch {
		// storage unavailable
	}
}
