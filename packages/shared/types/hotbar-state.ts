export interface HotbarState {
	platforms?: PlatformInfo[];
}

export interface PlatformInfo {
	name: string;
	completedGamesCount: number;
	icon: string;
	code: string;
}
