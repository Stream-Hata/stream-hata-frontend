import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import AuthLayout from '../../layout/auth-layout/auth-layout';
import { TuiButton } from '@taiga-ui/core';
import { TwitchService, type TwitchResponse } from '@shared/services/twitch.service';
import { catchError, of, switchMap, timer } from 'rxjs';

@Component({
	imports: [AuthLayout, TuiButton],
	selector: 'app-desktop-auth-page',
	styleUrl: './desktop-auth-page.scss',
	templateUrl: './desktop-auth-page.html',
})
export default class DesktopAuthPage {
	private readonly twitch = inject(TwitchService);
	private readonly http = inject(HttpClient);
	private readonly port = new URLSearchParams(location.search).get('port');
	readonly status = signal('Проверяем сессию…');
	readonly error = signal('');
	readonly profile = toSignal(
		timer(0, 30000).pipe(
			switchMap(() => this.twitch.login().pipe(catchError(() => of(null as TwitchResponse | null)))),
		),
		{ initialValue: null as TwitchResponse | null },
	);
	readonly loggedIn = computed(() => Boolean(this.profile()?.valid));

	constructor() {
		effect(() => {
			const profile = this.profile();

			if (profile?.valid) {
				this.issueCode();
			} else if (profile) {
				this.status.set('Войдите через Twitch, чтобы открыть приложение.');
			}
		});
	}

	connect(): void {
		const returnTo = `${location.origin}/desktop-auth${this.port ? `?port=${this.port}` : ''}`;
		this.twitch.connect(returnTo);
	}

	private issueCode(): void {
		if (this.status() === 'Передаём приложению…') {
			return;
		}

		this.status.set('Передаём приложению…');
		this.http.post('rgg-sync/twitch/reconnect', {}).subscribe({ error: () => undefined });
		this.http.post<{ code: string }>('rgg-sync/desktop/code', {}).subscribe({
			next: ({ code }) => {
				const target = this.port
					? `http://127.0.0.1:${this.port}/callback?code=${encodeURIComponent(code)}`
					: `streamhata://auth?code=${encodeURIComponent(code)}`;
				location.assign(target);
			},
			error: () => {
				this.error.set('Не удалось создать код входа. Попробуйте ещё раз.');
				this.status.set('Ошибка авторизации');
			},
		});
	}
}
