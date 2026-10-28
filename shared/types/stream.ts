export interface ObsStatus {
	connected: boolean;
	url: string;
	scenes: string[];
	currentScene: string;
	inputs: string[];
	streaming: boolean;
	recording: boolean;
	error?: string;
}

export interface StreamInfo {
	title: string;
	gameName: string;
	gameId: string;
	shieldMode: boolean;
	viewers: number;
}

export interface NotifySettings {
	enabled: boolean;
	discordWebhook: string;
	telegramToken: string;
	telegramChatId: string;
	telegramChatIds?: string[];
	onStreamOnline: boolean;
	onStreamOffline: boolean;
	onAlerts: boolean;
	onDonations: boolean;
	digest: boolean;
}

export interface ActionItem {
	name: string;
	description: string;
}

export interface SessionSample {
	at: string;
	viewers: number;
	chatters: number;
	messages: number;
}

export interface StreamSession {
	id: string;
	startedAt: string;
	endedAt: string | null;
	peakViewers: number;
	avgViewers: number;
	chatters: number;
	messages: number;
	samplesCount: number;
}

export interface AnalyticsState {
	current: StreamSession | null;
	history: StreamSession[];
	messages: number;
}
