import type { Game, GameTier } from '@shared/types/game';

export type RouletteMode = 'classic' | 'cat-bag' | 'elimination';

export interface RouletteFilters {
	platforms: string[];
	tiers: GameTier[];
	ages: string[];
	emulator: boolean | null;
	yearFrom: number;
	yearTo: number;
}

export interface RouletteWeights {
	tiers: Record<string, number>;
	platforms: Record<string, number>;
	games: Record<string, number>;
}

export interface RouletteAppearance {
	background: string;
	accent: string;
	text: string;
	fontFamily: string;
	fontUrl: string;
	scale: number;
	memeUrl: string;
}

export interface RouletteAudio {
	musicUrl: string;
	revealUrl: string;
	volume: number;
}

export interface RouletteReveal {
	durationSeconds: number;
	showCat: boolean;
	catImage: string;
	titleTemplate: string;
}

export interface RouletteConfig {
	mode: RouletteMode;
	filters: RouletteFilters;
	weights: RouletteWeights;
	avoidRecent: number;
	appearance: RouletteAppearance;
	audio: RouletteAudio;
	reveal: RouletteReveal;
}

export interface RouletteRound {
	id: string;
	mode: RouletteMode;
	platform: {
		code: string;
		name: string;
		icon: string;
		maintainer: string;
	};
	game: Game;
	createdAt: string;
}

export interface RouletteState {
	config: RouletteConfig;
	history: RouletteRound[];
	eliminated: string[];
	remaining: number;
}

export const DEFAULT_ROULETTE_CONFIG: RouletteConfig = {
	mode: 'classic',
	filters: {
		platforms: [],
		tiers: ['gold', 'diamond', 'platinum', 'none'],
		ages: ['classic', 'retro', 'modern', 'new'],
		emulator: null,
		yearFrom: 0,
		yearTo: 0,
	},
	weights: {
		tiers: { gold: 2, diamond: 3, platinum: 5, none: 1 },
		platforms: {},
		games: {},
	},
	avoidRecent: 10,
	appearance: {
		background: '#0F0817',
		accent: '#FF2EA6',
		text: '#F5EAFF',
		fontFamily: 'JetBrains Mono',
		fontUrl: '',
		scale: 1,
		memeUrl: '',
	},
	audio: {
		musicUrl: '',
		revealUrl: '',
		volume: 70,
	},
	reveal: {
		durationSeconds: 12,
		showCat: true,
		catImage: '',
		titleTemplate: '{{game}} · {{platform}}',
	},
};
