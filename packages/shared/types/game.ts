export type GameTier = 'none' | 'gold' | 'diamond' | 'platinum';
export type GameAge = 'classic' | 'retro' | 'modern' | 'new';
export type GameStatus = 'seed' | 'pending' | 'approved' | 'rejected' | 'merged';

export interface GamePlatform {
	code: string;
	name: string;
	icon: string;
	maintainer: string;
}

export interface GameEmulator {
	name: string;
	url: string;
	platforms: string[];
	os: string[];
	free: boolean;
	note?: string;
}

export interface GameSource {
	id: string;
	name: string;
	url: string;
	externalId?: string;
	importedAt: string;
}

export interface GameDownload {
	name: string;
	url: string;
	language?: string;
	note?: string;
}

export interface GamePopularCollection {
	name: string;
	summary?: string;
	image?: string;
	url: string;
	mods?: number;
}

export interface GamePopularMod {
	name: string;
	author?: string;
	summary?: string;
	image?: string;
	url: string;
	downloads?: number;
	endorsements?: number;
}

export interface Game {
	id: string;
	slug: string;
	title: string;
	titleRu?: string;
	searchTags?: string[];
	originalTitle?: string;
	aliases?: string[];
	year?: number;
	releaseDate?: string;
	platforms: GamePlatform[];
	genres?: string[];
	genresRu?: string[];
	modes?: string[];
	perspectives?: string[];
	themes?: string[];
	developers?: string[];
	publishers?: string[];
	description?: string;
	descriptionRu?: string;
	cover?: string;
	screenshots?: string[];
	tier: GameTier;
	age: GameAge;
	ageRating?: string;
	downloads?: GameDownload[];
	status: GameStatus;
	emulatorsRequired: boolean;
	emulators: GameEmulator[];
	sources: GameSource[];
	rating?: number;
	aggregatedRating?: number;
	completion?: {
		hastilyHours?: number;
		normallyHours?: number;
		completelyHours?: number;
	};
	dlc?: string[];
	editions?: string[];
	mods?: string[];
	popularMods?: GamePopularMod[];
	popularCollections?: GamePopularCollection[];
	website?: string;
	createdAt: string;
	updatedAt: string;
}

export interface GameFacet {
	value: string;
	count: number;
}

export interface GamePlatformFacet {
	code: string;
	name: string;
	count: number;
}

export interface GameFacets {
	platforms: GamePlatformFacet[];
	tiers: GameFacet[];
	ages: GameFacet[];
}

export interface GameListResponse {
	items: Game[];
	total: number;
	page: number;
	pageSize: number;
	facets: GameFacets;
}

export interface GameFilters {
	q?: string;
	platform?: string;
	tier?: string;
	age?: string;
	emulator?: boolean | null;
	verified?: boolean;
	yearFrom?: number;
	yearTo?: number;
	page?: number;
	pageSize?: number;
	sort?: string;
	order?: 'asc' | 'desc';
	facets?: boolean;
	enrich?: boolean;
}
