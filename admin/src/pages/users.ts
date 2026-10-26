import type { AdminUser } from '@shared/services/games-catalog.service';
import type { AccessRole, AccessRoles } from '@shared/services/access.service';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccessService } from '@shared/services/access.service';
import { GamesCatalogService } from '@shared/services/games-catalog.service';
import {
	TuiTable,
	TuiTableTbody,
	TuiTableTd,
	TuiTableTh,
	TuiTableThead,
} from '@taiga-ui/addon-table';
import { RouterLink } from '@angular/router';
import { TuiButton, TuiDropdown, TuiIcon, TuiInput, TuiSelectLike, TuiTextfield } from '@taiga-ui/core';
import { TuiBadge, TuiChevron, TuiDataListWrapper } from '@taiga-ui/kit';
import { catchError, of } from 'rxjs';

const ROLE_VALUES: AccessRole[] = ['viewer', 'vip', 'moderator', 'admin', 'owner'];
const ROLE_LABELS = ['Зритель', 'VIP', 'Модератор', 'Админ', 'Владелец'];

@Component({
	imports: [
		RouterLink,
		TuiBadge,
		TuiButton,
		TuiChevron,
		TuiDropdown,
		TuiDataListWrapper,
		TuiIcon,
		TuiInput,
		TuiSelectLike,
		TuiTable,
		TuiTableTbody,
		TuiTableTd,
		TuiTableTh,
		TuiTableThead,
		TuiTextfield,
	],
	selector: 'app-admin-users',
	template: `
		<div class="admin-page">
			<header class="admin-page-head">
				<div>
					<h1>Пользователи</h1>
					<p class="jk-caption">Аккаунты Twitch, токены и роли канала.</p>
				</div>
				<span appearance="info" tuiBadge>{{ users().length }} аккаунтов</span>
			</header>

			<div class="admin-grid">
				<section class="admin-metric">
					<div class="admin-metric-head"><tui-icon icon="@tui.crown" /> Владельцы</div>
					<strong class="admin-metric-value">{{ owners().length }}</strong>
					<span class="jk-caption">{{ owners().join(', ') || '—' }}</span>
				</section>
				<section class="admin-metric">
					<div class="admin-metric-head"><tui-icon icon="@tui.shield" /> Админы</div>
					<strong class="admin-metric-value">{{ admins().length }}</strong>
					<span class="jk-caption">{{ admins().join(', ') || '—' }}</span>
				</section>
				<section class="admin-metric">
					<div class="admin-metric-head"><tui-icon icon="@tui.users" /> Модераторы</div>
					<strong class="admin-metric-value">{{ moderators().length }}</strong>
					<span class="jk-caption">{{ moderators().join(', ') || '—' }}</span>
				</section>
				<section class="admin-metric">
					<div class="admin-metric-head"><tui-icon icon="@tui.star" /> VIP</div>
					<strong class="admin-metric-value">{{ vips().length }}</strong>
					<span class="jk-caption">{{ vips().join(', ') || '—' }}</span>
				</section>
			</div>

			<section class="admin-card">
				<div class="admin-card-head">
					<h2>Аккаунты</h2>
					<a appearance="flat" href="https://streamhata.rdpctd.dev/app/viewers" target="_blank" rel="noopener" tuiButton>
						Управление зрителями
					</a>
				</div>

				@if (users().length) {
					<table class="admin-table" tuiTable>
						<thead tuiThead>
							<tr>
								<th tuiTh>ID</th>
								<th tuiTh>Логин</th>
								<th tuiTh>Имя</th>
								<th tuiTh>Token</th>
								<th tuiTh>Роль</th>
								<th tuiTh></th>
							</tr>
						</thead>
						<tbody tuiTbody>
							@for (user of users(); track user.id) {
								<tr>
									<td tuiTd class="jk-caption">{{ user.id }}</td>
									<td tuiTd><strong>{{ user.username }}</strong></td>
									<td tuiTd>{{ user.displayName }}</td>
									<td tuiTd>
										@if (user.hasToken) {
											<span appearance="positive" tuiBadge>активен</span>
										} @else {
											<span appearance="neutral" tuiBadge>нет</span>
										}
									</td>
									<td tuiTd>
										<tui-textfield tuiChevron>
											<input
												aria-label="Роль пользователя"
												[readonly]="true"
												[value]="roleLabel(user.username)"
												tuiInput
												tuiSelectLike
											/>
											<tui-data-list-wrapper
												*tuiDropdown
												[items]="roleLabels"
												(itemClick)="setRole(user.username, $event)"
											/>
										</tui-textfield>
									</td>
									<td tuiTd>
										<div class="admin-table-actions">
											<a appearance="flat" size="s" [routerLink]="['/users', user.id]" tuiButton>Открыть</a>
											<button appearance="flat" size="s" type="button" (click)="remove(user)" tuiButton>Удалить</button>
										</div>
									</td>
								</tr>
							}
						</tbody>
					</table>
				} @else {
					<div class="admin-empty">
						<tui-icon icon="@tui.users" />
						<span class="jk-h4">Пользователей пока нет</span>
						<span class="jk-caption">Они появятся после входа через Twitch.</span>
					</div>
				}
			</section>
		</div>
	`,
})
export class UsersPage {
	private readonly access = inject(AccessService);
	private readonly catalog = inject(GamesCatalogService);
	private readonly destroyRef = inject(DestroyRef);
	readonly roles = signal<AccessRoles | null>(null);
	readonly users = signal<AdminUser[]>([]);
	readonly roleLabels = ROLE_LABELS;

	constructor() {
		this.access
			.get()
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((roles) => this.roles.set(roles));

		this.catalog
			.adminUsers()
			.pipe(catchError(() => of({ items: [] })), takeUntilDestroyed(this.destroyRef))
			.subscribe((response) => this.users.set(response.items));
	}

	roleFor(login: string): AccessRole {
		const roles = this.roles();

		if (!roles) {
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
	}

	roleLabel(login: string): string {
		return ROLE_LABELS[ROLE_VALUES.indexOf(this.roleFor(login))] ?? 'Зритель';
	}

	setRole(login: string, label: string): void {
		const index = ROLE_LABELS.indexOf(label);

		if (index < 0) {
			return;
		}

		this.access
			.setRole(login, ROLE_VALUES[index])
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((roles) => {
				if (roles) {
					this.roles.set(roles);
				}
			});
	}

	remove(user: AdminUser): void {
		this.catalog
			.deleteUser(user.id)
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((result) => {
				if (result?.deleted) {
					this.users.update((items) => items.filter((item) => item.id !== user.id));
				}
			});
	}

	readonly owners = () => this.roles()?.owners ?? [];
	readonly admins = () => this.roles()?.admins ?? [];
	readonly moderators = () => this.roles()?.moderators ?? [];
	readonly vips = () => this.roles()?.vips ?? [];
}
