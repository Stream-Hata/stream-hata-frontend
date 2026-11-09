import type {
	IncomingMessage,
	MessagingContact,
	MessagingEnvelope,
	MessagingGraph,
	RelationshipInfo,
} from '@shared/types/messaging';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MessagingService {
	private readonly http = inject(HttpClient);

	contacts(q = '') {
		return this.http.get<{ items: MessagingContact[] }>('rgg-sync/messaging/contacts', {
			params: q ? { q } : {},
		});
	}

	messages(withLogin: string, after = 0) {
		return this.http.get<{ items: MessagingEnvelope[]; peer: MessagingContact }>(
			'rgg-sync/messaging/messages',
			{ params: { with: withLogin, after } },
		);
	}

	send(recipient: string, envelope: unknown) {
		return this.http.post<{ id: number }>('rgg-sync/messaging/messages', { recipient, envelope });
	}

	relationship(withLogin: string) {
		return this.http.get<RelationshipInfo>('rgg-sync/messaging/relationship', {
			params: { with: withLogin },
		});
	}

	graph() {
		return this.http.get<MessagingGraph>('rgg-sync/messaging/graph');
	}

	saveIdentity(bundle: unknown) {
		return this.http.put<{ ok: boolean }>('rgg-sync/messaging/identity', bundle);
	}

	unread() {
		return this.http.get<{ items: IncomingMessage[]; count: number }>('rgg-sync/messaging/unread');
	}

	presence(withLogin: string) {
		return this.http.get<{ online: boolean; typing: boolean }>('rgg-sync/messaging/presence', {
			params: { with: withLogin },
		});
	}

	heartbeat() {
		return this.http.post<{ ok: boolean }>('rgg-sync/messaging/presence', {});
	}

	typing(withLogin: string) {
		return this.http.post<{ ok: boolean }>('rgg-sync/messaging/presence', { typing: withLogin });
	}

	deleteMessage(id: number) {
		return this.http.delete<{ ok: boolean }>('rgg-sync/messaging/messages', { params: { id } });
	}

	editMessage(id: number, envelope: unknown) {
		return this.http.patch<{ ok: boolean }>('rgg-sync/messaging/messages/edit', { id, envelope });
	}

	toggleReaction(messageId: number, emoji: string) {
		return this.http.post<{ ok: boolean; added: boolean }>('rgg-sync/messaging/reactions', {
			messageId,
			emoji,
		});
	}

	block(peer: string, blocked: boolean) {
		return this.http.post<{ ok: boolean; blocked: boolean }>('rgg-sync/messaging/block', {
			peer,
			blocked,
		});
	}

	setConversationState(peer: string, state: { pinned?: boolean; archived?: boolean }) {
		return this.http.patch<{ ok: boolean }>('rgg-sync/messaging/conversation/state', { peer, ...state });
	}

	deleteConversation(withLogin: string, scope: 'me' | 'all' = 'me') {
		return this.http.delete<{ ok: boolean; deleted: number }>('rgg-sync/messaging/conversation', {
			params: { with: withLogin, scope },
		});
	}

	markRead(ids: number[]) {
		return this.http.post<{ ok: boolean }>('rgg-sync/messaging/read', { ids });
	}

	recovery() {
		return this.http.get<Record<string, unknown>>('rgg-sync/messaging/recovery');
	}

	saveRecovery(blob: unknown) {
		return this.http.put<{ ok: boolean }>('rgg-sync/messaging/recovery', blob);
	}

	createTestPeer(bundle: unknown) {
		return this.http.post<{ login: string; displayName: string; isTest: boolean }>(
			'rgg-sync/messaging/test-peer',
			bundle,
		);
	}

	testReply(peer: string, envelope: unknown) {
		return this.http.post<{ id: number }>('rgg-sync/messaging/test-reply', { peer, envelope });
	}

	uploadAttachment(file: File) {
		const form = new FormData();

		form.append('file', file);

		return this.http.post<{ url: string }>('rgg-sync/messaging/upload', form);
	}
}
