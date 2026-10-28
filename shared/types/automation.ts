export interface ChatCommand {
	id: string;
	name: string;
	aliases: string[];
	action: string;
	response: string;
	reply?: string;
	limitReply?: string;
	cooldownSeconds: number;
	userLevel: string;
	enabled: boolean;
	counter: number;
	createdAt: string;
}

export interface CommandVariable {
	id: string;
	name: string;
	value: string;
	action: string;
}

export interface MessageTimer {
	id: string;
	name: string;
	messages: string[];
	intervalSeconds: number;
	enabled: boolean;
	activeOnly: boolean;
	random: boolean;
	lastFiredAt: string;
}

export interface ModerationFilters {
	dryRun: boolean;
	bannedWords: string[];
	blockLinks: boolean;
	capsEnabled: boolean;
	capsPercent: number;
	capsMinLength: number;
	emojiEnabled: boolean;
	emojiMax: number;
	repeatEnabled: boolean;
	repeatMax: number;
	repeatWindowSeconds: number;
	exemptModerators: boolean;
	action: string;
	timeoutSeconds: number;
	aiEnabled: boolean;
	aiThreshold: number;
	aiWindowChecks: number;
}

export interface ModerationLogEntry {
	id: string;
	user: string;
	text: string;
	reason: string;
	action: string;
	dryRun: boolean;
	createdAt: string;
}

export interface ModerationState {
	filters: ModerationFilters;
	log: ModerationLogEntry[];
}

export interface AlertEvent {
	id: string;
	type: string;
	username: string;
	message: string;
	amount: number;
	createdAt: string;
}

export interface AlertSettings {
	types: Record<string, boolean>;
	durationSeconds: number;
	soundEnabled: boolean;
	soundUrl: string;
	soundVolume: number;
}

export interface AlertsState {
	events: AlertEvent[];
	settings: AlertSettings;
}

export interface Trigger {
	action: string;
	command: string;
	aliases: string[];
	enabled: boolean;
	description: string;
}

export interface PointsWallet {
	userId: string;
	login: string;
	displayName: string;
	balance: number;
	totalEarned: number;
	totalSpent: number;
}

export interface PointsTransaction {
	id: string;
	userId: string;
	login: string;
	delta: number;
	reason: string;
	balanceAfter: number;
	createdAt: string;
}

export interface PointsReward {
	id: string;
	name: string;
	cost: number;
	response: string;
	enabled: boolean;
}

export interface PointsSettings {
	enabled: boolean;
	pointsPerMessage: number;
	messageCooldownSeconds: number;
	pointsPerMinute: number;
	streakBonusPerLevel: number;
	subscribeBonus: number;
	giftBonus: number;
	cheerBonusPerBit: number;
}

export interface PointsState {
	top: PointsWallet[];
	settings: PointsSettings;
	rewards: PointsReward[];
	transactions: PointsTransaction[];
}

export interface GameQuestion {
	text: string;
	answer: string;
}

export interface WheelSegment {
	id: string;
	label: string;
	multiplier: number;
	weight: number;
	color: string;
}

export interface WheelParticipant {
	userId: string;
	login: string;
	displayName: string;
	bet: number;
	baseBet?: number;
	boost?: number;
	chance?: number;
	color?: string;
	lot?: string;
	luck?: boolean;
	boostUsed?: boolean;
	luckMultiplier?: number;
}

export interface WheelRound {
	id: string;
	mode: string;
	title: string;
	bet: number;
	participants: WheelParticipant[];
	pot: number;
	state: 'collecting' | 'spinning' | 'finished';
	startedAt: string;
	deadline: string;
	spinAt?: string;
	spinEndsAt?: string;
	nextSpinAt?: string;
	finishedAt?: string;
	order?: WheelParticipant[];
	winner?: WheelParticipant;
	lastEliminated?: WheelParticipant;
	eliminatedAt?: string;
	refunded?: boolean;
}

export interface WheelBoost {
	value: number;
	weight: number;
}

export interface WheelAppearance {
	size: number;
	background: string;
	borderColor: string;
	borderWidth: number;
	glowColor: string;
	glowSize: number;
	pointerColor: string;
	centerColor: string;
	centerText: string;
	centerTextColor: string;
	labelColor: string;
	labelSize: number;
	labelStrokeColor: string;
	labelStrokeWidth: number;
	showLabels: boolean;
	showChances: boolean;
	fontFamily: string;
	fontUrl: string;
}

export interface GamesSettings {
	enabled: boolean;
	minBet: number;
	maxBet: number;
	slotsEnabled: boolean;
	slotsCooldownSeconds: number;
	wheelEnabled: boolean;
	wheelCooldownSeconds: number;
	wheelMode: 'spin' | 'elimination';
	wheelRoundSeconds: number;
	wheelLabelMode?: 'lot' | 'viewer';
	wheelSpinDelaySeconds?: number;
	wheelSpinCooldownSeconds?: number;
	wheelSegments: WheelSegment[];
	wheelSoundUrl?: string;
	wheelBoosts?: WheelBoost[];
	wheelAppearance?: WheelAppearance;
	wheelCenterUrl?: string;
	triviaEnabled: boolean;
	triviaPoints: number;
	triviaCooldownSeconds: number;
	triviaQuestions: GameQuestion[];
	duelEnabled: boolean;
	duelCooldownSeconds: number;
}

export interface GameLastResult {
	kind: string;
	mode?: string;
	title?: string;
	user: string;
	bet: number;
	win: number;
	label: string;
	multiplier: number;
	luckMultiplier?: number;
	at: string;
	participants?: WheelParticipant[];
	order?: WheelParticipant[];
}

export interface WheelState {
	settings: GamesSettings;
	round: WheelRound | null;
	last: GameLastResult | null;
}

export interface Quote {
	id: string;
	number: number;
	text: string;
	author: string;
	addedBy: string;
	createdAt: string;
}

export interface TwitchReward {
	id: string;
	title: string;
	prompt: string;
	cost: number;
	is_enabled: boolean;
}

export interface TwitchRewardsState {
	rewards: TwitchReward[];
	mappings: RedemptionMapping[];
}

export interface RedemptionMapping {
	id: string;
	rewardTitle: string;
	action: string;
	payload: string;
	enabled: boolean;
}

export interface RedemptionRecord {
	id: string;
	redemptionId: string;
	rewardId: string;
	userId: string;
	userName: string;
	rewardTitle: string;
	status: string;
	createdAt: string;
}

export interface RedemptionsState {
	mappings: RedemptionMapping[];
	recent: RedemptionRecord[];
}

export interface PollChoice {
	title: string;
	votes: number;
}

export interface Poll {
	id: string;
	title: string;
	status: string;
	choices: PollChoice[];
	startedAt: string;
	endsAt: string;
}

export interface PollPrediction {
	id: string;
	title: string;
	status: string;
	outcomes: PollChoice[];
	endsAt: string;
}

export interface PollsState {
	current: Poll | null;
	prediction: PollPrediction | null;
	history: Poll[];
}
