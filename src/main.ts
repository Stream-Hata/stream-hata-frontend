if (location.pathname.includes('/overlay')) {
	document.documentElement.classList.add('overlay-mode');
	document.documentElement.style.background = 'transparent';
	document.documentElement.style.colorScheme = 'normal';

	document.body?.classList.add('overlay-mode');

	if (document.body) {
		document.body.style.background = 'transparent';
	}
}

import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
