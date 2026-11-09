import { Injectable, signal } from '@angular/core';

export interface SystemNotice {
	id: string;
	title: string;
	body: string;
	kind: string;
	createdAt: string;
	read: boolean;
}

const STORAGE_KEY = 'nsh.system-notifications';
const FILTERS_KEY = 'nsh.notification-filters';
const LIMIT = 200;
const KINDS = ['message', 'monitor', 'clip', 'suggestion', 'discussion', 'system'] as const;
export type NotificationKind = (typeof KINDS)[number];

@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
	readonly items = signal<SystemNotice[]>(this.load());
	readonly unread = signal(this.items().filter((item) => !item.read).length);
	readonly filters = signal<Record<NotificationKind, boolean>>(this.loadFilters());

	isEnabled(kind: string): boolean {
		return this.filters()[kind as NotificationKind] ?? true;
	}

	setEnabled(kind: NotificationKind, enabled: boolean): void {
		this.filters.update((filters) => ({ ...filters, [kind]: enabled }));
		try {
			localStorage.setItem(FILTERS_KEY, JSON.stringify(this.filters()));
		} catch {
			// storage unavailable
		}
	}

	add(title: string, body: string, kind = 'system'): void {
		if (!this.isEnabled(kind)) {
			return;
		}
		const item: SystemNotice = {
			id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
			title,
			body,
			kind,
			createdAt: new Date().toISOString(),
			read: false,
		};

		this.items.update((items) => [item, ...items].slice(0, LIMIT));
		this.persist();
	}

	markAllRead(): void {
		this.items.update((items) => items.map((item) => ({ ...item, read: true })));
		this.persist();
	}

	clear(): void {
		this.items.set([]);
		this.persist();
	}

	remove(id: string): void {
		this.items.update((items) => items.filter((item) => item.id !== id));
		this.persist();
	}

	private persist(): void {
		this.unread.set(this.items().filter((item) => !item.read).length);
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items()));
		} catch {
			// storage unavailable
		}
	}

	private loadFilters(): Record<NotificationKind, boolean> {
		const defaults = Object.fromEntries(KINDS.map((kind) => [kind, true])) as Record<NotificationKind, boolean>;
		try {
			const stored = JSON.parse(localStorage.getItem(FILTERS_KEY) ?? '{}') as Partial<Record<NotificationKind, boolean>>;

			return { ...defaults, ...stored };
		} catch {
			return defaults;
		}
	}

	private load(): SystemNotice[] {
		try {
			const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as SystemNotice[];

			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}
}
