import type { AccessRole, AccessRoles } from '@shared/services/access.service';
import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccessService } from '@shared/services/access.service';
import { TwitchService } from '@shared/services/twitch.service';
import { catchError, of, switchMap, timer } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RoleService {
	private readonly access = inject(AccessService);
	private readonly twitch = inject(TwitchService);

	readonly roles = toSignal(
		timer(0, 30000).pipe(
			switchMap(() => this.access.get().pipe(catchError(() => of(null)))),
		),
		{ initialValue: null as AccessRoles | null },
	);

	readonly profile = toSignal(
		timer(0, 30000).pipe(
			switchMap(() => this.twitch.login().pipe(catchError(() => of(null)))),
		),
		{ initialValue: null },
	);

	readonly login = computed(() => {
		const user = this.profile()?.user;

		return (user?.username || user?.displayName || '').trim().toLowerCase();
	});

	readonly role = computed<AccessRole>(() => {
		const login = this.login();
		const roles = this.roles();

		if (!login || !roles) {
			return 'viewer';
		}

		if (roles.owners.includes(login)) {
			return 'owner';
		}

		if (roles.admins.includes(login)) {
			return 'admin';
		}

		if (roles.moderators.includes(login)) {
			return 'moderator';
		}

		if (roles.vips.includes(login)) {
			return 'vip';
		}

		return 'viewer';
	});

	readonly isAdmin = computed(() => this.role() === 'owner' || this.role() === 'admin');
}
