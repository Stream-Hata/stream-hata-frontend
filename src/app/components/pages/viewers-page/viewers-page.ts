import type { Viewer } from '@shared/types/viewer';
import { Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { signalControl } from '@shared/helpers/form-control';
import { TwitchService } from '@shared/services/twitch.service';
import { AccessService, type AccessRole, type AccessRoles } from '@shared/services/access.service';
import {
	TuiTable,
	TuiTableTbody,
	TuiTableTd,
	TuiTableTh,
	TuiTableThead,
} from '@taiga-ui/addon-table';
import { TuiButton, TuiIcon, TuiInput, TuiSelectLike, TuiTextfield } from '@taiga-ui/core';
import { TuiBadge, TuiChevron, TuiDataListWrapper } from '@taiga-ui/kit';
import { catchError, of, switchMap, timer } from 'rxjs';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
	day: 'numeric',
	month: 'short',
	hour: '2-digit',
	minute: '2-digit',
};

interface ViewerRow extends Viewer {
	rank: number;
	lastSeenLabel: string;
	firstSeenLabel: string;
	leader: boolean;
}

@Component({
	imports: [ReactiveFormsModule, TuiBadge, TuiButton, TuiChevron, TuiDataListWrapper, TuiIcon, TuiInput, TuiSelectLike, TuiTable, TuiTableTbody, TuiTableTd, TuiTableTh, TuiTableThead, TuiTextfield],
	selector: 'app-viewers-page',
	styleUrl: './viewers-page.scss',
	templateUrl: './viewers-page.html',
})
export default class ViewersPage {
	private readonly twitch = inject(TwitchService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly access = inject(AccessService);
	private readonly injector = inject(Injector);

	readonly roles = signal<AccessRoles>({ owners: [], admins: [], moderators: [], vips: [] });
	readonly ownerDraft = signal('');
	readonly roleValues: AccessRole[] = ['viewer', 'vip', 'moderator', 'admin', 'owner'];
	readonly roleLabels = ['Зритель', 'VIP', 'Модератор', 'Админ', 'Владелец'];
	readonly search = signal('');
	readonly searchControl = signalControl(this.search, this.injector);
	readonly data = toSignal(
		timer(0, 5000).pipe(
			switchMap(() =>
				this.twitch
					.getViewers()
					.pipe(catchError(() => of({ total: 0, viewers: [] as Viewer[] }))),
			),
		),
		{ initialValue: { total: 0, viewers: [] as Viewer[] } },
	);

	constructor() {
		this.access
			.get()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (roles) => this.roles.set(roles),
				error: () => undefined,
			});
	}

	roleFor(login: string): AccessRole {
		const roles = this.roles();
		const value = login.toLowerCase();

		if (roles.owners.includes(value)) {
			return 'owner';
		}

		if (roles.admins.includes(value)) {
			return 'admin';
		}

		if (roles.moderators.includes(value)) {
			return 'moderator';
		}

		if (roles.vips.includes(value)) {
			return 'vip';
		}

		return 'viewer';
	}

	roleLabel(login: string): string {
		return this.roleLabels[this.roleValues.indexOf(this.roleFor(login))] ?? 'Зритель';
	}

	setRole(login: string, label: string): void {
		const index = this.roleLabels.indexOf(label);
		const role = this.roleValues[index] ?? 'viewer';

		this.access
			.setRole(login, role)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((roles) => this.roles.set(roles));
	}

	addOwner(): void {
		const login = this.ownerDraft().trim().toLowerCase();

		if (!login || this.roles().owners.includes(login)) {
			return;
		}

		this.access
			.save({ ...this.roles(), owners: [...this.roles().owners, login] })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((roles) => {
				this.roles.set(roles);
				this.ownerDraft.set('');
			});
	}

	removeOwner(login: string): void {
		this.access
			.save({
				...this.roles(),
				owners: this.roles().owners.filter((item) => item !== login),
			})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((roles) => this.roles.set(roles));
	}

	readonly rows = computed<ViewerRow[]>(() => {
		const search = this.search().trim().toLowerCase();
		const viewers = [...this.data().viewers].sort((a, b) => b.watchStreak - a.watchStreak);
		const maxStreak = viewers[0]?.watchStreak ?? 0;

		return viewers
			.filter(
				(viewer) =>
					!search ||
					viewer.displayName.toLowerCase().includes(search) ||
					viewer.login.toLowerCase().includes(search),
			)
			.map((viewer, index) => ({
				...viewer,
				rank: index + 1,
				lastSeenLabel: formatDate(viewer.lastSeenAt),
				firstSeenLabel: formatDate(viewer.firstSeenAt),
				leader: viewer.watchStreak > 0 && viewer.watchStreak === maxStreak,
			}));
	});

	readonly total = computed(() => this.data().total);
	readonly maxStreak = computed(() => this.rows()[0]?.watchStreak ?? 0);
}

function formatDate(value: string): string {
	const date = new Date(value);

	return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU', DATE_FORMAT);
}
