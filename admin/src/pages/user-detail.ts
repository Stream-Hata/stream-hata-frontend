import type { AdminUser } from '@shared/services/games-catalog.service';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GamesCatalogService } from '@shared/services/games-catalog.service';
import { TuiButton, TuiIcon, TuiInput, TuiTextfield } from '@taiga-ui/core';
import { TuiBadge, TuiSwitch, TuiTextarea } from '@taiga-ui/kit';
import { catchError, of } from 'rxjs';

@Component({
	imports: [ReactiveFormsModule, RouterLink, TuiBadge, TuiButton, TuiIcon, TuiInput, TuiSwitch, TuiTextarea, TuiTextfield],
	selector: 'app-admin-user-detail',
	template: `
		<div class="admin-page">
			<header class="admin-page-head">
				<div>
					<a appearance="flat" routerLink="/users" tuiButton>← К списку пользователей</a>
					<h1>{{ user()?.displayName || user()?.username || 'Пользователь' }}</h1>
					<p class="jk-caption">@{{ user()?.username }} · Twitch ID {{ user()?.twitchId }}</p>
				</div>
				@if (user()?.banned) {
					<span appearance="negative" tuiBadge>Забанен</span>
				} @else {
					<span appearance="positive" tuiBadge>Активен</span>
				}
			</header>

			@if (loading()) {
				<div class="admin-card admin-empty">Загружаем пользователя…</div>
			} @else if (user(); as current) {
				<div class="admin-grid">
					<section class="admin-card">
						<div class="admin-card-head"><h2>Профиль</h2></div>
						<div class="admin-user-card">
							@if (current.avatar) {
								<img class="admin-user-avatar" [alt]="current.displayName" [src]="current.avatar" />
							} @else {
								<span class="admin-user-avatar">{{ initials(current) }}</span>
							}
							<div>
								<strong>{{ current.displayName }}</strong>
								<div class="jk-caption">@{{ current.username }}</div>
								<div class="jk-caption">ID {{ current.id }} · Twitch {{ current.twitchId }}</div>
							</div>
						</div>
						<div class="detail-row"><span class="jk-label">Token</span><span>{{ current.hasToken ? 'активен' : 'нет' }}</span></div>
						<div class="detail-row"><span class="jk-label">Обновлён</span><span>{{ current.updatedAt }}</span></div>
					</section>

					<section class="admin-card">
						<div class="admin-card-head"><h2>Блокировка</h2></div>
						<p class="jk-caption">Полный бан блокирует вход в StreamHata и доступ к платформе.</p>
						<label class="admin-switch">
							<input type="checkbox" [formControl]="banned" tuiSwitch />
							<span>Забанить пользователя на платформе</span>
						</label>
						<tui-textfield>
							<textarea rows="4" placeholder="Причина блокировки" [formControl]="reason" tuiTextarea></textarea>
						</tui-textfield>
						<div class="admin-card-head">
							<button appearance="primary" type="button" (click)="saveBan()" tuiButton>Сохранить</button>
							@if (saved()) { <span class="admin-success">{{ saved() }}</span> }
						</div>
					</section>
				</div>

				<section class="admin-card">
					<div class="admin-card-head"><h2>Опасная зона</h2></div>
					<p class="jk-caption">Удаление аккаунта удалит пользователя и его токены из админки.</p>
					<button appearance="secondary-destructive" type="button" (click)="remove()" tuiButton>Удалить пользователя</button>
				</section>
			} @else {
				<div class="admin-card admin-empty">Пользователь не найден</div>
			}
		</div>
	`,
})
export class UserDetailPage {
	private readonly catalog = inject(GamesCatalogService);
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);
	readonly user = signal<AdminUser | null>(null);
	readonly loading = signal(true);
	readonly banned = new FormControl(false, { nonNullable: true });
	readonly reason = new FormControl('', { nonNullable: true });
	readonly saved = signal('');
	private id = 0;

	constructor() {
		this.id = Number(this.route.snapshot.paramMap.get('id') ?? 0);
		this.catalog
			.adminUser(this.id)
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((user) => {
				this.loading.set(false);

				if (user) {
					this.apply(user);
				}
			});
	}

	initials(user: AdminUser): string {
		return (user.displayName || user.username || 'U')
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0] ?? '')
			.join('')
			.toUpperCase();
	}

	saveBan(): void {
		this.catalog
			.setUserBan(this.id, this.banned.value, this.reason.value.trim())
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((user) => {
				if (!user) {
					this.saved.set('Ошибка сохранения');

					return;
				}

				this.apply(user);
				this.saved.set('Сохранено');
			});
	}

	remove(): void {
		this.catalog
			.deleteUser(this.id)
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((result) => {
				if (result?.deleted) {
					location.assign('/users');
				}
			});
	}

	private apply(user: AdminUser): void {
		this.user.set(user);
		this.banned.setValue(user.banned);
		this.reason.setValue(user.banReason ?? '');
		this.saved.set('');
	}
}
