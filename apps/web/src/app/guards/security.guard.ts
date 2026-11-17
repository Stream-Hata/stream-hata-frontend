import type { CanActivateFn } from '@angular/router';
import type { AccessMembership } from '@shared/services/access.service';
import type { TwitchResponse } from '@shared/services/twitch.service';
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';

export const securityGuard: CanActivateFn = async () => {
	const http = inject(HttpClient);
	const router = inject(Router);

	try {
		const [profile, membership] = await firstValueFrom(
			forkJoin([
				http.get<TwitchResponse>('rgg-sync/twitch').pipe(catchError(() => of(null))),
				http
					.get<AccessMembership>('rgg-sync/access/membership')
					.pipe(catchError(() => of(null))),
			]),
		);
		const login = (profile?.user?.username || profile?.user?.displayName || '')
			.trim()
			.toLowerCase();
		const allowed = Boolean(
			login &&
			membership &&
			(membership.role === 'owner' ||
				membership.role === 'admin' ||
				membership.groupAdmin),
		);

		return allowed ? true : router.parseUrl('/app/dashboard');
	} catch {
		return router.parseUrl('/login');
	}
};
