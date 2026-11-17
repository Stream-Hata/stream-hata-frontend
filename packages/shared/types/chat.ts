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

export interface ChatBadge {
	set_id: string;
	version: string;
	info?: string;
}

export interface LiveChatMessage {
	message_id: string;
	broadcaster: ChatUser;
	author: ChatUser;
	text: string;
	sent_at: string;
	color?: string;
	emotes?: ChatEmote[];
	badges?: ChatBadge[];
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
