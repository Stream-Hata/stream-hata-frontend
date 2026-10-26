import type { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export type AccessRole = 'owner' | 'admin' | 'moderator' | 'vip' | 'viewer';

export interface AccessRoles {
	owners: string[];
	admins: string[];
	moderators: string[];
	vips: string[];
}

@Injectable({ providedIn: 'root' })
export class AccessService {
	private readonly http = inject(HttpClient);

	get(): Observable<AccessRoles> {
		return this.http.get<AccessRoles>('rgg-sync/access');
	}

	save(roles: AccessRoles): Observable<AccessRoles> {
		return this.http.put<AccessRoles>('rgg-sync/access', roles);
	}

	setRole(login: string, role: AccessRole): Observable<AccessRoles> {
		return this.http.post<AccessRoles>('rgg-sync/access/role', { login, role });
	}

	role(login: string): Observable<{ role: AccessRole }> {
		return this.http.get<{ role: AccessRole }>('rgg-sync/access/role', {
			params: { login },
		});
	}
}
