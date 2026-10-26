import { Component, inject } from '@angular/core';
import { TwitchService } from '@shared/services/twitch.service';
import { catchError, of } from 'rxjs';
import { TuiButton } from '@taiga-ui/core';
import AuthLayout from '../../layout/auth-layout/auth-layout';

@Component({
	imports: [AuthLayout, TuiButton],
	selector: 'app-login-page',
	styleUrl: './login-page.scss',
	templateUrl: './login-page.html',
})
export default class LoginPage {
	private readonly twitch = inject(TwitchService);

	constructor() {
		this.twitch.login().pipe(catchError(() => of(null))).subscribe((response) => {
			if (response?.valid) {
				location.replace('/app/dashboard');
			}
		});
	}

	connect(): void {
		this.twitch.connect();
	}
}
