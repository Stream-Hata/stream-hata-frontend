import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiButton, TuiCheckbox, TuiInput, TuiLabel, TuiLink, TuiTextfield } from '@taiga-ui/core';
import AuthLayout from '../../layout/auth-layout/auth-layout';

@Component({
	imports: [
		RouterLink,
		AuthLayout,
		TuiButton,
		TuiCheckbox,
		TuiInput,
		TuiLabel,
		TuiLink,
		TuiTextfield,
	],
	selector: 'app-signup-page',
	styleUrl: './signup-page.scss',
	templateUrl: './signup-page.html',
})
export default class SignupPage {
	readonly email = signal('');
	readonly password = signal('');
	readonly terms = signal(false);
	readonly valid = computed(
		() => this.email().includes('@') && this.password().length >= 6 && this.terms(),
	);

	check(event: Event): boolean {
		return (event.target as HTMLInputElement).checked;
	}
}
