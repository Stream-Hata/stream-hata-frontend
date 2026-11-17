export interface DonationEvent {
	id: string;
	provider: string;
	type: string;
	username: string;
	message: string;
	amount: number;
	currency: string;
	createdAt: string;
}

export interface DonationProviderStatus {
	name: string;
	state: string;
	detail: string;
}

export interface DonationTopEntry {
	username: string;
	amount: number;
	currency: string;
	count: number;
}

export interface DonationStats {
	totalCount: number;
	totals: Record<string, number>;
	today: Record<string, number>;
	top: DonationTopEntry[];
}

export interface DonationGoal {
	id: string;
	provider: string;
	title: string;
	currency: string;
	startAmount: number;
	raisedAmount: number;
	goalAmount: number;
	active: boolean;
	updatedAt: string;
}

export interface DonationsSnapshot {
	recent: DonationEvent[];
	stats: DonationStats;
	providers: DonationProviderStatus[];
	goals: DonationGoal[];
}

export type DonationLayout = 'card' | 'table' | 'combined';
export type DonationPosition =
	| 'top-left'
	| 'top-center'
	| 'top-right'
	| 'middle-left'
	| 'center'
	| 'middle-right'
	| 'bottom-left'
	| 'bottom-center'
	| 'bottom-right';
export type DonationAnimation = 'pop' | 'slide-up' | 'slide-left' | 'flip' | 'glitch' | 'bounce';
export type DonationTtsProvider = 'auto' | 'groq' | 'fishaudio' | 'browser';

export interface DonationWidgetConfig {
	minAmount: number;
	durationSeconds: number;
	maxRows: number;
	layout: DonationLayout;
	position: DonationPosition;
	animation: DonationAnimation;
	showAmount: boolean;
	showMessage: boolean;
	showTable: boolean;
	width: number;
	scale: number;
	background: string;
	textColor: string;
	accentColor: string;
	borderColor: string;
	glowColor: string;
	blur: number;
	fontFamily: string;
	fontUrl: string;
	soundUrl: string;
	soundVolume: number;
	ttsEnabled: boolean;
	ttsProvider: DonationTtsProvider;
	ttsVoice: string;
	ttsModel: string;
	ttsVolume: number;
	ttsMinAmount: number;
	ttsTemplate: string;
	kicker: string;
	goalsEnabled: boolean;
	goalWidth: number;
	goalBackground: string;
	goalAccent: string;
	goalTextColor: string;
	goalShowPercent: boolean;
	goalShowAmounts: boolean;
	goalManualTitle: string;
	goalManualCurrent: number;
	goalManualTarget: number;
	goalManualCurrency: string;
}

export const DEFAULT_DONATION_CONFIG: DonationWidgetConfig = {
	minAmount: 0,
	durationSeconds: 10,
	maxRows: 5,
	layout: 'combined',
	position: 'top-right',
	animation: 'pop',
	showAmount: true,
	showMessage: true,
	showTable: true,
	width: 460,
	scale: 1,
	background: 'rgba(18, 18, 24, 0.92)',
	textColor: '#F5EAFF',
	accentColor: '#FF2EA6',
	borderColor: 'rgba(255, 255, 255, 0.12)',
	glowColor: 'rgba(255, 46, 166, 0.35)',
	blur: 16,
	fontFamily: 'Inter',
	fontUrl: '',
	soundUrl: '',
	soundVolume: 70,
	ttsEnabled: false,
	ttsProvider: 'auto',
	ttsVoice: 'troy',
	ttsModel: 'canopylabs/orpheus-v1-english',
	ttsVolume: 80,
	ttsMinAmount: 0,
	ttsTemplate: 'Донат от {user} на {amount} {currency}. {message}',
	kicker: 'ДОНАТ',
	goalsEnabled: true,
	goalWidth: 460,
	goalBackground: 'rgba(18, 18, 24, 0.92)',
	goalAccent: '#39FF88',
	goalTextColor: '#F5EAFF',
	goalShowPercent: true,
	goalShowAmounts: true,
	goalManualTitle: 'Цель стрима',
	goalManualCurrent: 0,
	goalManualTarget: 10000,
	goalManualCurrency: 'RUB',
};

export function donationConfig(value: Partial<DonationWidgetConfig> | null | undefined): DonationWidgetConfig {
	return { ...DEFAULT_DONATION_CONFIG, ...(value ?? {}) };
}
