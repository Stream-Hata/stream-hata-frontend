export interface ObsStatus {
	connected: boolean;
	url: string;
	scenes: string[];
	currentScene: string;
	inputs: string[];
	sources: string[];
	streaming: boolean;
	recording: boolean;
	error?: string;
}

export interface ObsTransform {
	positionX?: number;
	positionY?: number;
	width?: number;
	height?: number;
	sourceWidth?: number;
	sourceHeight?: number;
	rotation?: number;
	alignment?: number;
	scaleX?: number;
	scaleY?: number;
	boundsType?: string;
	boundsAlignment?: number;
	boundsWidth?: number;
	boundsHeight?: number;
	cropToBounds?: boolean;
	cropLeft?: number;
	cropRight?: number;
	cropTop?: number;
	cropBottom?: number;
}

export interface ObsSceneItem {
	id: number;
	sourceName: string;
	index: number;
	enabled: boolean;
	locked: boolean;
	transform: ObsTransform;
}

export interface ObsVideoSettings {
	baseWidth: number;
	baseHeight: number;
	outputWidth: number;
	outputHeight: number;
}

export interface ObsSceneSnapshot {
	scene: string;
	video: ObsVideoSettings;
	items: ObsSceneItem[];
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
	telegramOwnerLogin?: string;
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


export interface ObsStats {
	activeFps: number;
	averageFrameRenderTime: number;
	cpuUsage: number;
	memoryUsage: number;
	renderSkippedFrames: number;
	renderTotalFrames: number;
	outputSkippedFrames: number;
	outputTotalFrames: number;
	availableDiskSpace: number;
}
