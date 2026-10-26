export interface ChatEmote {
	id: string;
	name: string;
	start: number;
	end: number;
	provider: string;
}

export interface ChatUser {
	id: string;
	login: string;
	display_name: string;
}

export interface LiveChatMessage {
	message_id: string;
	broadcaster: ChatUser;
	author: ChatUser;
	text: string;
	sent_at: string;
	emotes?: ChatEmote[];
}

export interface SevenTVSnapshot {
	emotes: Record<string, string>;
	updatedAt: string;
	error?: string;
}

export interface EmotesResponse {
	sevenTV: SevenTVSnapshot;
	twitchTemplate: string;
}
