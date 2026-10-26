import type { ApplicationConfig } from '@angular/core';
import type { TuiStringHandler } from '@taiga-ui/cdk';
import { provideHttpClient } from '@angular/common/http';
import { ErrorHandler, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router';

import { I18nService } from '@shared/services/i18n.service';
import { provideTaiga, TUI_ICON_RESOLVER } from '@taiga-ui/core';
import { TUI_LANGUAGE } from '@taiga-ui/i18n';
import { routes } from './app.routes';
import { AppErrorHandler } from '@shared/services/app-error-handler';

export const appConfig: ApplicationConfig = {
	providers: [
		provideBrowserGlobalErrorListeners(),
		{ provide: ErrorHandler, useClass: AppErrorHandler },
		provideRouter(routes, withPreloading(PreloadAllModules)),
		provideTaiga(),
		provideHttpClient(),
		{
			provide: TUI_LANGUAGE,
			useFactory: () => inject(I18nService).taigaLanguage,
		},
		{
			provide: TUI_ICON_RESOLVER,
			useValue: ((icon: string): string =>
				icon.startsWith('@tui.')
					? `assets/taiga-ui/icons/${icon.slice(5)}.svg`
					: `icons/svg/${icon}.svg`) satisfies TuiStringHandler<string>,
		},
	],
};
