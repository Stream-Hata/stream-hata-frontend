export interface ChatJuryMessage {
	id: string;

	author: {
		id: string;
		username: string;
		display_name: string;
	};

	text: string;

	created_at: string;

	advice_confidence: number;
}

export interface ChatJurySettings {
	enabled: boolean;

	duration_seconds: number;

	min_confidence: number;
}

export interface ChatJuryPublic {
	id: string;

	status: 'voting' | 'finished';

	message: ChatJuryMessage;

	votes: {
		yea: number;
		nei: number;
	};

	total: number;

	approval_rate: number;

	verdict: string | null;

	started_at: string;

	ends_at: string;
}

export interface ChatJuryResult {
	id: string;

	message: ChatJuryMessage;

	status: 'finished';

	yea: number;

	nei: number;

	total: number;

	approval_rate: number;

	verdict: string | null;

	started_at: string;

	ends_at: string;
}
