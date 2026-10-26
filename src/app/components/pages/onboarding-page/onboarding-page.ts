import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiButton, TuiIcon, TuiSlider } from '@taiga-ui/core';
import { TuiStepper } from '@taiga-ui/kit';
import { Logo } from '../../ui/logo/logo';

@Component({
	imports: [RouterLink, TuiButton, TuiIcon, TuiSlider, TuiStepper, Logo],
	selector: 'app-onboarding-page',
	styleUrl: './onboarding-page.scss',
	templateUrl: './onboarding-page.html',
})
export default class OnboardingPage {
	readonly step = signal(0);
	readonly threshold = signal(60);

	next(): void {
		this.step.update((value) => Math.min(2, value + 1));
	}

	prev(): void {
		this.step.update((value) => Math.max(0, value - 1));
	}
}
