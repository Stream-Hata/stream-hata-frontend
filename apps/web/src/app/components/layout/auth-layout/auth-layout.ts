import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from '../../ui/logo/logo';

@Component({
	imports: [RouterLink, Logo],
	selector: 'app-auth-layout',
	styleUrl: './auth-layout.scss',
	templateUrl: './auth-layout.html',
})
export default class AuthLayout {}
