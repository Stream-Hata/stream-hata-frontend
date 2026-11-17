import type { Identity } from '@shared/crypto/secure-messaging';
import type { CodeIssue } from '@shared/messaging/code-format';
import type { contactBundle, MessagingEnvelope } from '@shared/types/messaging';
import type { DisplayMessage } from './messages-page.types';
import { decryptMessage } from '@shared/crypto/secure-messaging';
import { validateCodeBlock } from '@shared/messaging/code-format';
import { detectCodeLanguage, parseMessageContent } from '@shared/messaging/message-content';

export async function renderMessage(
	item: MessagingEnvelope,
	identity: Identity,
	peer: ReturnType<typeof contactBundle>,
	selfLogin: string,
): Promise<DisplayMessage> {
	try {
		const mine = item.sender === selfLogin;
		const text = await decryptMessage(
			identity,
			mine ? identity.bundle : peer,
			item.envelope,
			mine ? peer : undefined,
		);
		const parsed = parseMessageContent(text);
		const codeIssues: CodeIssue[] = [];

		for (const span of parsed.spans) {
			if (span.kind !== 'codeblock') {
				continue;
			}
			const language = span.language || detectCodeLanguage(span.text) || '';
			const issue = await validateCodeBlock(span.text, language);

			if (issue) {
				codeIssues.push({ ...issue, message: `${language || 'code'}: ${issue.message}` });
			}
		}

		return {
			id: item.id,
			mine,
			text,
			spans: parsed.spans,
			media: parsed.media,
			createdAt: item.createdAt,
			encrypted: item.envelope.algorithm !== 'PLAINTEXT',
			error: '',
			editedAt: item.editedAt,
			readAt: item.readAt,
			reactions: item.reactions ?? [],
			codeIssues,
		};
	} catch {
		return {
			id: item.id,
			mine: item.sender === selfLogin,
			text: '',
			spans: [],
			media: [],
			createdAt: item.createdAt,
			encrypted: true,
			error: 'Не удалось расшифровать сообщение',
			reactions: item.reactions ?? [],
			codeIssues: [],
		};
	}
}
