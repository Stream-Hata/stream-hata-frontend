import type { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const desktopGuard: CanActivateFn = () => {
	const desktop =
		navigator.userAgent.includes('NamelessStreamHataDesktop') ||
		'__TAURI_INTERNALS__' in window;

	return desktop ? true : inject(Router).parseUrl('/');
};

export const landingGuard: CanActivateFn = () => {
	const desktop =
		navigator.userAgent.includes('NamelessStreamHataDesktop') ||
		'__TAURI_INTERNALS__' in window;

	return desktop ? inject(Router).parseUrl('/app/dashboard') : true;
};
