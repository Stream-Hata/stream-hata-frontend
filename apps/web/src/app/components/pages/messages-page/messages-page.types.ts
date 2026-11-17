import type { CodeIssue } from '@shared/messaging/code-format';
import type { MediaAttachment, MessageSpan } from '@shared/messaging/message-content';
import type { MessageReaction, MessagingContact } from '@shared/types/messaging';

export interface DisplayMessage {
	id: number;
	mine: boolean;
	text: string;
	spans: MessageSpan[];
	media: MediaAttachment[];
	createdAt: string;
	encrypted: boolean;
	error: string;
	editedAt?: string;
	readAt?: string;
	reactions: MessageReaction[];
	codeIssues: CodeIssue[];
}

export interface PendingAttachment {
	file: File;
	name: string;
	size: number;
	previewUrl: string | null;
	asDocument: boolean;
}

export type MessageContext =
	| { kind: 'format'; x: number; y: number }
	| { kind: 'message'; x: number; y: number; message: DisplayMessage }
	| { kind: 'dialog'; x: number; y: number; contact: MessagingContact };

export interface GraphNodeView {
	login: string;
	displayName: string;
	label: string;
	strength: number;
	x: number;
	y: number;
}
