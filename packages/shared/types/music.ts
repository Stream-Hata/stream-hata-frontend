export interface Track {
	videoId: string;
	kind?: 'youtube' | 'audio' | 'video';
	url: string;
	title: string;
	author: string;
	album: string;
	year: number;
	durationSeconds: number;
	thumbnail: string;
	links: string[];
	addedBy: string;
	firstAddedAt: string;
	lastAddedAt: string;
	timesAdded: number;
}

export interface MusicStats {
	totalTracks: number;
	totalDurationSeconds: number;
	uniqueAuthors: number;
}

export interface MusicListResponse {
	tracks: Track[];
	stats: MusicStats;
	enabled: boolean;
}
