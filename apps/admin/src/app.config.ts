import type { ApplicationConfig } from '@angular/core';
import SecurityAdminPage from '@admin-ui/security-admin-page/security-admin-page';
import TrustAdminPage from '@admin-ui/trust-admin-page/trust-admin-page';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTaiga, TUI_ICON_RESOLVER } from '@taiga-ui/core';
import { DashboardPage } from './pages/dashboard';
import { GameEditPage } from './pages/game-edit';
import { GamesAdminPage } from './pages/games';
import { ImportsPage } from './pages/imports';
import { PluginsAdminPage } from './pages/plugins';
import { SuggestionsAdminPage } from './pages/suggestions';
import { SynonymsPage } from './pages/synonyms';
import { UserDetailPage } from './pages/user-detail';
import { UsersPage } from './pages/users';

export const appConfig: ApplicationConfig = {
	providers: [
		provideHttpClient(),
		provideTaiga(),
		{
			provide: TUI_ICON_RESOLVER,
			useValue: (icon: string): string =>
				icon.startsWith('@tui.')
					? `assets/taiga-ui/icons/${icon.slice(5)}.svg`
					: `icons/svg/${icon}.svg`,
		},
		provideRouter([
			{ path: '', component: DashboardPage },
			{ path: 'games', component: GamesAdminPage },
			{ path: 'games/:slug', component: GameEditPage },
			{ path: 'synonyms', component: SynonymsPage },
			{ path: 'users', component: UsersPage },
			{ path: 'users/:id', component: UserDetailPage },
			{ path: 'plugins', component: PluginsAdminPage },
			{ path: 'suggestions', component: SuggestionsAdminPage },
			{ path: 'imports', component: ImportsPage },
			{ path: 'security', component: SecurityAdminPage },
			{ path: 'security/trust', component: TrustAdminPage },
			{ path: '**', redirectTo: '' },
		]),
	],
};
