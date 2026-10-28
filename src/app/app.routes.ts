/* eslint-disable max-len */
import type { Routes } from '@angular/router';
import { gameResolver } from './components/pages/game-details-page/game-resolver';
import { gamesResolver } from './components/pages/games-page/games-resolver';
import { profileResolver } from './components/pages/profile-page/profile-resolver';
import { rouletteResolver } from './components/pages/roulette-page/roulette-resolver';
import { desktopGuard, landingGuard } from './guards/desktop.guard';

export const routes: Routes = [
	{
		path: '',
		canActivate: [landingGuard],
		loadComponent: () => import('./components/pages/landing-page/landing-page'),
		title: 'Nameless StreamHata — чат решает. Стрим живёт.',
	},
	{
		path: 'app',
		canActivate: [desktopGuard],
		loadComponent: () => import('./components/layout/app-shell/app-shell'),
		children: [
			{ path: '', pathMatch: 'full', redirectTo: 'dashboard' },
			{
				path: 'dashboard',
				loadComponent: () => import('./components/pages/dashboard-page/dashboard-page'),
				title: 'Дашборд · Nameless StreamHata',
			},
			{
				path: 'games',
				loadComponent: () => import('./components/pages/games-page/games-page'),
				resolve: { games: gamesResolver },
				title: 'Игры · Nameless StreamHata',
			},
			{
				path: 'widgets/system/config',
				loadComponent: () =>
					import('./components/pages/system-widget-config-page/system-widget-config-page'),
				title: 'Система · Nameless StreamHata',
			},
			{
				path: 'system',
				loadComponent: () =>
					import('./components/pages/system-page/system-page').then((module) => module.SystemPage),
				title: 'Система · Nameless StreamHata',
			},
			{
				path: 'games/:slug',
				loadComponent: () => import('./components/pages/game-details-page/game-details-page'),
				resolve: { game: gameResolver },
				title: 'Игра · Nameless StreamHata',
			},
			{
				path: 'events',
				loadComponent: () => import('./components/pages/events-page/events-page'),
				title: 'События · Nameless StreamHata',
			},
			{
				path: 'events/:id',
				loadComponent: () => import('./components/pages/event-details-page/event-details-page'),
				title: 'Событие · Nameless StreamHata',
			},
			{
				path: 'chat-jury',
				loadComponent: () => import('./components/pages/chat-jury-page/chat-jury-page'),
				title: 'Чат-жюри · Nameless StreamHata',
			},
			{
				path: 'chat-jury/settings',
				loadComponent: () =>
					import('./components/pages/chat-jury-settings-page/chat-jury-settings-page'),
				title: 'Настройки чат-жюри · Nameless StreamHata',
			},
			{
				path: 'widgets',
				loadComponent: () => import('./components/pages/widgets-page/widgets-page'),
				title: 'Виджеты · Nameless StreamHata',
			},
			{
				path: 'widgets/:kind/config',
				loadComponent: () => import('./components/pages/widget-config-page/widget-config-page'),
				title: 'Настройка виджета · Nameless StreamHata',
			},
			{
				path: 'viewers',
				loadComponent: () => import('./components/pages/viewers-page/viewers-page'),
				title: 'Зрители · Nameless StreamHata',
			},
			{
				path: 'chat',
				loadComponent: () => import('./components/pages/chat-page/chat-page'),
				title: 'Чат · Nameless StreamHata',
			},
			{
				path: 'stream',
				loadComponent: () => import('./components/pages/stream-page/stream-page'),
				title: 'Стрим и OBS · Nameless StreamHata',
			},
			{
				path: 'points',
				loadComponent: () => import('./components/pages/points-page/points-page'),
				title: 'Баллы · Nameless StreamHata',
			},
			{
				path: 'roulette',
				loadComponent: () => import('./components/pages/roulette-page/roulette-page'),
				resolve: { roulette: rouletteResolver },
				title: 'Рулетка игр · Nameless StreamHata',
			},
			{
				path: 'wheel',
				loadComponent: () => import('./components/pages/wheel-page/wheel-page'),
				title: 'Колесо · Nameless StreamHata',
			},
			{
				path: 'polls',
				loadComponent: () => import('./components/pages/polls-page/polls-page'),
				title: 'Опросы · Nameless StreamHata',
			},
			{
				path: 'telegram/editor',
				loadComponent: () =>
					import('./components/pages/telegram-command-editor-page/telegram-command-editor-page'),
				title: 'Редактор команды Telegram · Nameless StreamHata',
			},
			{
				path: 'telegram',
				loadComponent: () => import('./components/pages/telegram-bot-page/telegram-bot-page'),
				title: 'Telegram-бот · Nameless StreamHata',
			},
			{
				path: 'commands',
				loadComponent: () => import('./components/pages/commands-page/commands-page'),
				title: 'Команды · Nameless StreamHata',
			},
			{
				path: 'commands/editor',
				loadComponent: () =>
					import('./components/pages/automation-editor-page/automation-editor-page'),
				title: 'Редактор автоматизации · Nameless StreamHata',
			},
			{
				path: 'moderation',
				loadComponent: () => import('./components/pages/moderation-page/moderation-page'),
				title: 'Модерация · Nameless StreamHata',
			},
			{
				path: 'donations',
				loadComponent: () => import('./components/pages/donations-page/donations-page'),
				title: 'Донаты · Nameless StreamHata',
			},
			{
				path: 'music',
				loadComponent: () => import('./components/pages/music-page/music-page'),
				title: 'Музыка · Nameless StreamHata',
			},
			{
				path: 'twitch',
				loadComponent: () => import('./components/pages/twitch-page/twitch-page'),
				title: 'Twitch · Nameless StreamHata',
			},
			{
				path: 'settings',
				loadComponent: () => import('./components/pages/settings-page/settings-page'),
				title: 'Настройки · Nameless StreamHata',
			},
			{
				path: 'profile',
				loadComponent: () => import('./components/pages/profile-page/profile-page'),
				resolve: { profile: profileResolver },
				title: 'Профиль · Nameless StreamHata',
			},
			{
				path: 'notifications/settings',
				loadComponent: () =>
					import('./components/pages/notification-settings-page/notification-settings-page'),
				title: 'Настройки уведомлений · Nameless StreamHata',
			},
			{
				path: 'notifications',
				loadComponent: () => import('./components/pages/notifications-page/notifications-page'),
				title: 'Уведомления · Nameless StreamHata',
			},
		],
	},
	{
		path: 'changelog',
		loadComponent: () => import('./components/pages/changelog-page/changelog-page'),
		title: 'Что нового · Nameless StreamHata',
	},
	{
		path: 'events',
		loadComponent: () => import('./components/pages/public-events-page/public-events-page'),
		title: 'События · Nameless StreamHata',
	},
	{
		path: 'terms',
		loadComponent: () => import('./components/pages/terms-page/terms-page'),
		title: 'Пользовательское соглашение · Nameless StreamHata',
	},
	{
		path: 'faq',
		loadComponent: () => import('./components/pages/faq-page/faq-page'),
		title: 'FAQ · Nameless StreamHata',
	},
	{
		path: 'suggest-game',
		loadComponent: () => import('./components/pages/suggest-game-page/suggest-game-page'),
		title: 'Предложить игру · Nameless StreamHata',
	},
	{
		path: 'about',
		loadComponent: () => import('./components/pages/about-page/about-page'),
		title: 'О стримере · Nameless StreamHata',
	},
	{
		path: 'desktop-auth',
		loadComponent: () => import('./components/pages/desktop-auth-page/desktop-auth-page'),
		title: 'Вход в приложение · Nameless StreamHata',
	},
	{
		path: 'login',
		loadComponent: () => import('./components/pages/login-page/login-page'),
		title: 'Вход · Nameless StreamHata',
	},
	{
		path: 'signup',
		loadComponent: () => import('./components/pages/signup-page/signup-page'),
		title: 'Регистрация · Nameless StreamHata',
	},
	{
		path: 'onboarding',
		loadComponent: () => import('./components/pages/onboarding-page/onboarding-page'),
		title: 'Добро пожаловать · Nameless StreamHata',
	},
	{
		path: 'overlay/:kind',
		loadComponent: () => import('./components/overlays/overlay-host/overlay-host'),
		title: 'Overlay · Nameless StreamHata',
	},
	{
		path: '**',
		loadComponent: () => import('./components/pages/not-found-page/not-found-page'),
		title: '404 · Nameless StreamHata',
	},
];
