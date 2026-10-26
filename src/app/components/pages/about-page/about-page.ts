import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiIcon, TuiLink } from '@taiga-ui/core';
import { Logo } from '../../ui/logo/logo';

@Component({
	imports: [RouterLink, TuiIcon, TuiLink, Logo],
	selector: 'app-about-page',
	styleUrl: './about-page.scss',
	templateUrl: './about-page.html',
})
export default class AboutPage {}
