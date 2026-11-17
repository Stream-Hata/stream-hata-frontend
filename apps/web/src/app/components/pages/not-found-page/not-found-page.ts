import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';
import { Logo } from '../../ui/logo/logo';

@Component({
	imports: [RouterLink, TuiButton, Logo],
	selector: 'app-not-found-page',
	styleUrl: './not-found-page.scss',
	templateUrl: './not-found-page.html',
})
export default class NotFoundPage {}
