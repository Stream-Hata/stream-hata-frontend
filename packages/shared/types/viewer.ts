export interface Viewer {
	userId: string;
	login: string;
	displayName: string;

	watchStreak: number;
	channelPointsAwarded: number;

	firstSeenAt: string;
	lastSeenAt: string;
}

export interface ViewerListResponse {
	total: number;
	viewers: Viewer[];
}

export interface ViewerWatchStreakEvent {
	userId: string;
	login: string;
	displayName: string;

	streakCount: number;
	channelPointsAwarded: number;
}
