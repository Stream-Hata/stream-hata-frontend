import type { ElementRef } from '@angular/core';
import type { Identity } from '@shared/crypto/secure-messaging';
import type { CodeIssue } from '@shared/messaging/code-format';
import type { MediaAttachment, MessageSpan } from '@shared/messaging/message-content';
import type { TwitchResponse } from '@shared/services/twitch.service';
import type { MessageReaction, MessagingContact, MessagingEnvelope, MessagingGraph, RelationshipInfo } from '@shared/types/messaging';
import { Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { decryptMessage, encryptMessage, generateIdentity } from '@shared/crypto/secure-messaging';
import { describeCodeError, formatCode, formatFencedCode } from '@shared/messaging/code-format';
import { detectCodeLanguage, parseMessageContent } from '@shared/messaging/message-content';
import { ChatLiveService } from '@shared/services/chat-live.service';
import { I18nService } from '@shared/services/i18n.service';
import { MessagingIdentityService } from '@shared/services/messaging-identity.service';
import { MessagingPresenceService } from '@shared/services/messaging-presence.service';
import { MessagingService } from '@shared/services/messaging.service';
import { TwitchChatSocketService } from '@shared/services/twitch-chat.service';
import { TwitchService } from '@shared/services/twitch.service';
import { contactBundle } from '@shared/types/messaging';
import { TuiButton, TuiDialog, TuiIcon, TuiInput, TuiTextfield } from '@taiga-ui/core';
import { TuiBadge, TuiSwitch, TuiTextarea } from '@taiga-ui/kit';
import { catchError, firstValueFrom, of, switchMap, timer } from 'rxjs';

interface DisplayMessage {
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
}

type MessageContext =
	| { kind: 'format'; x: number; y: number }
	| { kind: 'message'; x: number; y: number; message: DisplayMessage }
	| { kind: 'dialog'; x: number; y: number; contact: MessagingContact };

interface GraphNodeView {
	login: string;
	displayName: string;
	label: string;
	strength: number;
	x: number;
	y: number;
}

@Component({
	imports: [TuiBadge, TuiButton, TuiDialog, TuiIcon, TuiInput, TuiSwitch, TuiTextarea, TuiTextfield],
	selector: 'app-messages-page',
	styleUrl: './messages-page.scss',
	templateUrl: './messages-page.html',
})
export default class MessagesPage {
	private readonly messaging = inject(MessagingService);
	private readonly identityService = inject(MessagingIdentityService);
	private readonly twitch = inject(TwitchService);
	readonly i18n = inject(I18nService);
	private readonly router = inject(Router);
	private readonly presenceService = inject(MessagingPresenceService);
	private readonly destroyRef = inject(DestroyRef);
	readonly composerInput = viewChild<ElementRef<HTMLTextAreaElement>>('composerInput');
	readonly messagesScroll = viewChild<ElementRef<HTMLElement>>('messagesScroll');

	readonly profile = toSignal(
		timer(0, 30000).pipe(
			switchMap(() => this.twitch.login().pipe(catchError(() => of(null as TwitchResponse | null)))),
		),
		{ initialValue: null as TwitchResponse | null },
	);

	readonly selfLogin = computed(() => this.profile()?.user?.username ?? '');
	readonly identity = signal<Identity | null>(null);
	readonly contacts = signal<MessagingContact[]>([]);
	readonly selected = signal<MessagingContact | null>(null);
	readonly messages = signal<DisplayMessage[]>([]);
	readonly relationship = signal<RelationshipInfo | null>(null);
	readonly graph = signal<MessagingGraph | null>(null);
	readonly graphOpen = signal(false);
	readonly search = signal('');
	readonly draft = signal('');
	readonly encryptEnabled = signal(true);
	readonly loading = signal(true);
	readonly sending = signal(false);
	readonly uploadingAttachment = signal(false);
	readonly error = signal('');
	readonly creatingTest = signal(false);
	readonly contextMenu = signal<MessageContext | null>(null);
	readonly contextMenuElement = viewChild<ElementRef<HTMLElement>>('contextMenu');

	readonly replyTo = signal<DisplayMessage | null>(null);
	readonly editing = signal<DisplayMessage | null>(null);
	readonly presence = signal({ online: false, typing: false });
	readonly messageQuery = signal('');
	readonly searching = signal(false);
	readonly tab = signal<'streamhata' | 'twitch'>('streamhata');
	readonly twitchChannel = signal('');
	readonly twitchDraft = signal('');
	readonly twitchSocket = inject(TwitchChatSocketService);
	private readonly chatLive = inject(ChatLiveService);
	readonly forwardOpen = signal(false);
	readonly deleteOpen = signal(false);
	readonly deleteTarget = signal<MessagingContact | null>(null);
	readonly forwardMessage = signal<DisplayMessage | null>(null);
	readonly codeIssue = signal<CodeIssue | null>(null);
	private presenceTimer?: ReturnType<typeof setInterval>;
	private lastTypingAt = 0;
	private contactSearchTimer?: ReturnType<typeof setTimeout>;
	private formatTimer?: ReturnType<typeof setTimeout>;

	readonly filteredContacts = computed(() => {
		const query = this.search().trim().toLowerCase();

		return this.contacts()
			.filter(
				(contact) =>
					!contact.archived &&
					(!query ||
						contact.login.toLowerCase().includes(query) ||
						contact.displayName.toLowerCase().includes(query)),
			)
			.sort((left, right) => Number(right.pinned) - Number(left.pinned) || left.displayName.localeCompare(right.displayName));
	});

	readonly archivedContacts = computed(() =>
		this.contacts().filter((contact) => contact.archived),
	);

	readonly presenceLabel = computed(() => {
		if (this.presence().typing) {
			return 'печатает…';
		}

		return this.presence().online ? 'онлайн' : 'офлайн';
	});

	readonly visibleMessages = computed(() => {
		const query = this.messageQuery().trim().toLowerCase();

		return query
			? this.messages().filter((message) => message.text.toLowerCase().includes(query))
			: this.messages();
	});

	readonly graphNodes = computed<GraphNodeView[]>(() => {
		const nodes = this.graph()?.nodes ?? [];
		const radius = 112;

		return nodes.map((node, index) => {
			const angle = nodes.length ? (index / nodes.length) * Math.PI * 2 - Math.PI / 2 : 0;

			return {
				...node,
				x: 160 + Math.cos(angle) * radius,
				y: 160 + Math.sin(angle) * radius,
			};
		});
	});

	constructor() {
		void this.init();
	}

	async init(): Promise<void> {
		this.loading.set(true);
		const identity = await this.identityService.ensure();

		if (!identity) {
			this.error.set('Мессенджер доступен только в desktop-приложении.');
			this.loading.set(false);

			return;
		}
		this.identity.set(identity);
		this.messaging.contacts().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: ({ items }) => {
				this.contacts.set(this.applyLocalState(items));
				this.loading.set(false);
			},
			error: () => {
				this.error.set('Не удалось загрузить список стримеров.');
				this.loading.set(false);
			},
		});
	}

	onDraftInput(event: Event): void {
		const value = (event.target as HTMLTextAreaElement).value;
		this.draft.set(value);
		this.codeIssue.set(null);
		this.autoResize();
		if (value.endsWith('```')) {
			if (this.formatTimer) {
				clearTimeout(this.formatTimer);
			}
			this.formatTimer = setTimeout(() => void this.formatDraftCode(), 300);
		}
		const contact = this.selected();
		const now = Date.now();

		if (contact && now - this.lastTypingAt > 2000) {
			this.lastTypingAt = now;
			this.presenceService.typing(contact.login).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => undefined });
		}
	}

	uploadAttachment(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		input.value = '';

		if (!file || this.uploadingAttachment()) {
			return;
		}

		this.uploadingAttachment.set(true);
		this.error.set('');
		this.messaging
			.uploadAttachment(file)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ url }) => {
					const current = this.draft();

					this.draft.set(`${current}${current ? '\n' : ''}${url}`);
					this.uploadingAttachment.set(false);
					this.autoResize();
				},
				error: () => {
					this.error.set('Не удалось загрузить вложение.');
					this.uploadingAttachment.set(false);
				},
			});
	}

	onComposerKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Enter' || event.isComposing) {
			return;
		}
		if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
			event.preventDefault();
			void this.sendAsCode();

			return;
		}
		if (!event.shiftKey) {
			event.preventDefault();
			void this.send();
		}
	}

	connectTwitch(): void {
		this.twitchSocket.connect(this.twitchChannel());
	}

	sendTwitch(): void {
		const text = this.twitchDraft().trim();
		const channel = this.twitchSocket.channel();
		if (!text || !channel) return;
		this.chatLive.send(text, channel).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: () => {
				this.twitchDraft.set('');
				this.twitchSocket.messages.update((items) => [
					...items,
					{ id: `local-${Date.now()}`, user: 'Вы', text, color: '#22e0ff' },
				]);
			},
			error: () => this.error.set('Не удалось отправить в Twitch-чат.'),
		});
	}

	onContactSearch(event: Event): void {
		const query = (event.target as HTMLInputElement).value;
		this.search.set(query);
		if (this.contactSearchTimer) {
			clearTimeout(this.contactSearchTimer);
		}
		if (query.trim().length < 2) {
			this.searching.set(false);
			return;
		}
		this.searching.set(true);
		this.contactSearchTimer = setTimeout(() => {
			this.messaging.contacts(query.trim()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
				next: ({ items }) => {
					this.contacts.update((contacts) => {
						const known = new Set(contacts.map((contact) => contact.login));
						return [...contacts, ...items.filter((item) => !known.has(item.login))];
					});
					this.searching.set(false);
				},
				error: () => this.searching.set(false),
			});
		}, 350);
	}

	openTwitchChat(): void {
		const target = this.search().trim().replace(/^@/, '');
		if (target) {
			void this.router.navigate(['/app/chat'], { queryParams: { target } });
		}
	}

	openFormatMenu(event: MouseEvent): void {
		event.preventDefault();
		this.openContext({ kind: 'format', x: this.menuX(event), y: this.menuY(event) });
	}

	openDialogMenu(event: MouseEvent, contact: MessagingContact): void {
		event.preventDefault();
		this.openContext({ kind: 'dialog', x: this.menuX(event), y: this.menuY(event), contact });
	}

	openMessageMenu(event: MouseEvent, message: DisplayMessage): void {
		event.preventDefault();
		this.openContext({
			kind: 'message',
			x: this.menuX(event),
			y: this.menuY(event),
			message,
		});
	}

	private openContext(menu: MessageContext): void {
		this.contextMenu.set(menu);
		requestAnimationFrame(() => {
			const element = this.contextMenuElement()?.nativeElement;

			if (!element) {
				return;
			}
			const rect = element.getBoundingClientRect();
			const margin = 8;
			const x = Math.max(margin, Math.min(menu.x, window.innerWidth - rect.width - margin));
			const y = Math.max(margin, Math.min(menu.y, window.innerHeight - rect.height - margin));

			this.contextMenu.update((current) => (current ? { ...current, x, y } : current));
		});
	}

	closeMenu(): void {
		this.contextMenu.set(null);
	}

	applyFormat(kind: 'bold' | 'italic' | 'code' | 'spoiler' | 'codeblock', color = ''): void {
		const textarea = this.composerInput()?.nativeElement;

		if (!textarea) {
			return;
		}
		const start = textarea.selectionStart ?? textarea.value.length;
		const end = textarea.selectionEnd ?? start;
		const selected = textarea.value.slice(start, end) || 'текст';
		const wrapped =
			kind === 'bold'
				? `**${selected}**`
				: kind === 'italic'
					? `__${selected}__`
					: kind === 'code'
						? `\`${selected}\``
						: kind === 'spoiler'
							? `||${selected}||`
							: `\`\`\`\n${selected}\n\`\`\``;
		const replacement = color ? `{color:${color}}${selected}{/color}` : wrapped;

		textarea.setRangeText(replacement, start, end, 'end');
		this.draft.set(textarea.value);
		this.autoResize();
		this.closeMenu();
		textarea.focus();
	}

	async sendAsCode(): Promise<void> {
		const textarea = this.composerInput()?.nativeElement;
		const draft = this.draft();
		const start = textarea?.selectionStart ?? 0;
		const end = textarea?.selectionEnd ?? 0;
		const selected = draft.slice(start, end).trim();
		const code = selected || draft.trim();

		if (!code || this.sending()) {
			return;
		}
		const language = detectCodeLanguage(code) ?? '';
		let formatted = code;

		try {
			formatted = (await formatCode(code, language)).trimEnd();
			this.codeIssue.set(null);
		} catch (error) {
			this.codeIssue.set(describeCodeError(error));

			return;
		}
		const block = `\`\`\`${language}\n${formatted}\n\`\`\``;
		const outgoing = selected
			? `${draft.slice(0, start)}${block}${draft.slice(end)}`
			: block;

		this.draft.set(outgoing);
		this.autoResize();
		await this.send(outgoing);
	}

	async formatDraftCode(): Promise<void> {
		const textarea = this.composerInput()?.nativeElement;
		const source = this.draft();

		if (!textarea || !source.includes('```')) {
			return;
		}
		const start = textarea.selectionStart ?? source.length;
		let formatted: string;

		try {
			formatted = await formatFencedCode(source, true);
			this.codeIssue.set(null);
		} catch (error) {
			this.codeIssue.set(describeCodeError(error));

			return;
		}
		if (formatted === source) {
			return;
		}
		this.draft.set(formatted);
		this.autoResize();
		setTimeout(() => {
			const input = this.composerInput()?.nativeElement;
			const position = Math.min(start, formatted.length);

			input?.focus();
			input?.setSelectionRange(position, position);
		});
	}

	copyMessage(message: DisplayMessage): void {
		void navigator.clipboard.writeText(message.text);
		this.closeMenu();
	}

	reply(message: DisplayMessage): void {
		this.replyTo.set(message);
		this.closeMenu();
		setTimeout(() => this.composerInput()?.nativeElement.focus());
	}

	cancelReply(): void {
		this.replyTo.set(null);
	}

	deleteMessage(message: DisplayMessage): void {
		if (!message.mine || !window.confirm('Удалить сообщение?')) {
			return;
		}
		this.messaging.deleteMessage(message.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: () => {
				this.messages.update((items) => items.filter((item) => item.id !== message.id));
				if (this.editing()?.id === message.id) {
					this.cancelEdit();
				}
				this.closeMenu();
			},
			error: () => this.error.set('Не удалось удалить сообщение.'),
		});
	}

	private startPresencePolling(login: string): void {
		if (this.presenceTimer) {
			clearInterval(this.presenceTimer);
		}
		const poll = () =>
			this.messaging.presence(login).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
				next: (value) => {
					this.presence.set(value);
					this.contacts.update((items) =>
						items.map((item) => (item.login === login ? { ...item, online: value.online } : item)),
					);
				},
				error: () => undefined,
			});

		poll();
		this.presenceTimer = setInterval(poll, 4000);
		this.destroyRef.onDestroy(() => {
			if (this.presenceTimer) {
				clearInterval(this.presenceTimer);
			}
		});
	}

	private menuX(event: MouseEvent): number {
		return event.clientX;
	}

	private menuY(event: MouseEvent): number {
		return event.clientY;
	}

	async createTestPeer(): Promise<void> {
		if (this.creatingTest()) {
			return;
		}
		this.creatingTest.set(true);
		try {
			const testIdentity = await generateIdentity();
			const peer = await firstValueFrom(this.messaging.createTestPeer(testIdentity.bundle));
			localStorage.setItem(`nsh.messaging-test.${peer.login}`, JSON.stringify(testIdentity));
			const contact: MessagingContact = {
				...peer,
				avatar: '',
				keyId: testIdentity.bundle.keyId,
				encryptionKey: testIdentity.bundle.encryptionKey,
				signingKey: testIdentity.bundle.signingKey,
			};
			this.contacts.update((items) => [...items, contact]);
			this.select(contact);
		} catch {
			this.error.set('Не удалось создать тестового собеседника.');
		} finally {
			this.creatingTest.set(false);
		}
	}

	select(contact: MessagingContact): void {
		this.selected.set(contact);
		this.editing.set(null);
		this.replyTo.set(null);
		this.presence.set({ online: Boolean(contact.online), typing: false });
		this.startPresencePolling(contact.login);
		this.messages.set([]);
		this.relationship.set(null);
		this.messaging.relationship(contact.login).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: (value) => this.relationship.set(value),
			error: () => undefined,
		});
		void this.loadMessages(contact);
	}

	async loadMessages(contact: MessagingContact): Promise<void> {
		const identity = this.identity();

		if (!identity) {
			return;
		}
		this.messaging.messages(contact.login).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: async ({ items, peer }) => {
				const bundle = contactBundle(peer);
				const rendered: DisplayMessage[] = [];

				for (const item of items) {
					rendered.push(await this.renderMessage(item, identity, bundle));
				}
				this.messages.set(rendered);
				this.scrollToBottom();
				const incoming = items.filter((item) => item.sender !== this.selfLogin()).map((item) => item.id);

				if (incoming.length) {
					this.messaging.markRead(incoming).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => undefined });
				}
			},
			error: () => this.error.set('Не удалось загрузить переписку.'),
		});
	}

	async send(textOverride?: string): Promise<void> {
		const text = (textOverride ?? this.draft()).trim();
		const contact = this.selected();
		const identity = this.identity();
		const self = this.selfLogin();

		if (!text || !contact || !identity || !self || this.sending()) {
			return;
		}
		this.sending.set(true);
		const reply = this.replyTo();
		const source = reply ? `> ${reply.text.slice(0, 200)}\n${text}` : text;
		let outgoing: string;

		try {
			if (!source.includes('```')) {
				const language = detectCodeLanguage(source);

				const codeLike = /[{}();=<>]|^\s*(?:def|function|const|let|var|class|import|package|func)\b/m.test(
					source,
				);

				if (language && codeLike) {
					await formatCode(source, language);
				}
			}
			outgoing = await formatFencedCode(source, true);
			this.codeIssue.set(null);
		} catch (error) {
			this.codeIssue.set(describeCodeError(error));
			this.sending.set(false);

			return;
		}
		try {
			const envelope = await encryptMessage(
				identity,
				self,
				contact.login,
				contactBundle(contact),
				outgoing,
				this.encryptEnabled(),
			);
			const editing = this.editing();

			if (editing) {
				this.messaging.editMessage(editing.id, envelope).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
					next: () => {
						const parsed = parseMessageContent(outgoing);
						this.messages.update((items) =>
							items.map((item) =>
								item.id === editing.id
									? {
										...item,
										text: outgoing,
										spans: parsed.spans,
										media: parsed.media,
										editedAt: new Date().toISOString(),
									}
									: item,
							),
						);
						this.draft.set('');
						this.editing.set(null);
						this.sending.set(false);
						this.autoResize();
					},
					error: () => {
						this.error.set('Не удалось изменить сообщение.');
						this.sending.set(false);
					},
				});
				return;
			}
			this.messaging.send(contact.login, envelope).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
				next: ({ id }) => {
					const parsed = parseMessageContent(outgoing);

					this.messages.update((messages) => [
						...messages,
						{
							id,
							mine: true,
							text: outgoing,
							spans: parsed.spans,
							media: parsed.media,
							createdAt: new Date().toISOString(),
							encrypted: this.encryptEnabled(),
							error: '',
							reactions: [],
						},
					]);
					this.draft.set('');
					this.replyTo.set(null);
					this.autoResize();
					this.sending.set(false);
					this.scrollToBottom();
					if (contact.isTest) {
						setTimeout(() => void this.replyAsTestPeer(contact, text), 600);
					}
				},
				error: () => {
					this.error.set('Не удалось отправить сообщение.');
					this.sending.set(false);
				},
			});
		} catch {
			this.error.set('Не удалось зашифровать сообщение.');
			this.sending.set(false);
		}
	}

	private async replyAsTestPeer(contact: MessagingContact, text: string): Promise<void> {
		const identity = this.identity();
		const self = this.selfLogin();
		const stored = localStorage.getItem(`nsh.messaging-test.${contact.login}`);

		if (!identity || !self || !stored) {
			return;
		}
		try {
			const testIdentity = JSON.parse(stored) as Identity;
			const envelope = await encryptMessage(
				testIdentity,
				contact.login,
				self,
				identity.bundle,
				`Тестовый ответ: ${text}`,
				this.encryptEnabled(),
			);
			await firstValueFrom(this.messaging.testReply(contact.login, envelope));
			await this.loadMessages(contact);
		} catch {
			// test reply is best-effort
		}
	}

	openForward(message: DisplayMessage): void {
		this.forwardMessage.set(message);
		this.forwardOpen.set(true);
		this.closeMenu();
	}

	async forwardTo(contact: MessagingContact): Promise<void> {
		const source = this.forwardMessage();
		const identity = this.identity();
		const self = this.selfLogin();

		if (!source || !identity || !self) {
			return;
		}
		try {
			const envelope = await encryptMessage(
				identity,
				self,
				contact.login,
				contactBundle(contact),
				`↪ ${source.text}`,
				this.encryptEnabled(),
			);
			await new Promise<void>((resolve, reject) => {
				this.messaging.send(contact.login, envelope).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
					next: () => resolve(),
					error: reject,
				});
			});
			this.forwardOpen.set(false);
			this.forwardMessage.set(null);
		} catch {
			this.error.set('Не удалось переслать сообщение.');
		}
	}

	react(message: DisplayMessage, emoji: string): void {
		this.messaging.toggleReaction(message.id, emoji).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: ({ added }) => {
				this.messages.update((items) =>
					items.map((item) => {
						if (item.id !== message.id) {
							return item;
						}
						const current = item.reactions.find((reaction) => reaction.emoji === emoji);
						const reactions = item.reactions
							.map((reaction) =>
								reaction.emoji === emoji
									? {
										...reaction,
										count: reaction.count + (added ? 1 : -1),
										mine: added,
									}
									: reaction,
							)
							.filter((reaction) => reaction.count > 0);

						if (!current && added) {
							reactions.push({ emoji, count: 1, mine: true });
						}

						return { ...item, reactions };
					}),
				);
			},
			error: () => this.error.set('Не удалось поставить реакцию.'),
		});
	}

	startEdit(message: DisplayMessage): void {
		if (!message.mine) {
			return;
		}
		this.editing.set(message);
		this.replyTo.set(null);
		this.draft.set(message.text);
		this.closeMenu();
		setTimeout(() => {
			this.composerInput()?.nativeElement.focus();
			this.autoResize();
		});
	}

	cancelEdit(): void {
		this.editing.set(null);
		this.draft.set('');
		this.autoResize();
	}

	toggleDialog(contact: MessagingContact, key: 'pinned' | 'archived'): void {
		const value = !contact[key];
		this.contacts.update((items) => items.map((item) => item.login === contact.login ? { ...item, [key]: value } : item));
		this.persistDialogState(contact.login, key, value);
		this.messaging.setConversationState(contact.login, { [key]: value }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => undefined });
		this.closeMenu();
	}

	deleteDialog(contact: MessagingContact, scope: 'me' | 'all'): void {
		this.messaging.deleteConversation(contact.login, scope).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: () => {
				if (this.selected()?.login === contact.login) {
					this.messages.set([]);
					this.selected.set(null);
				}
				this.closeMenu();
			},
		});
	}

	toggleBlock(): void {
		const contact = this.selected();
		const relationship = this.relationship();

		if (!contact) {
			return;
		}
		const blocked = !relationship?.blocked;
		this.messaging.block(contact.login, blocked).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: () => {
				this.relationship.set({
					strength: relationship?.strength ?? 0,
					mutual: relationship?.mutual ?? false,
					blocked,
					label: blocked ? 'Заблокирован' : 'Незнакомец',
				});
			},
			error: () => this.error.set('Не удалось изменить блокировку.'),
		});
	}

	private applyLocalState(items: MessagingContact[]): MessagingContact[] {
		try {
			const stored = JSON.parse(localStorage.getItem('nsh.dialog-state') ?? '{}') as Record<string, { pinned?: boolean; archived?: boolean }>;
			return items.map((item) => ({ ...item, ...stored[item.login] }));
		} catch {
			return items;
		}
	}

	private persistDialogState(login: string, key: 'pinned' | 'archived', value: boolean): void {
		try {
			const stored = JSON.parse(localStorage.getItem('nsh.dialog-state') ?? '{}') as Record<string, { pinned?: boolean; archived?: boolean }>;
			stored[login] = { ...stored[login], [key]: value };
			localStorage.setItem('nsh.dialog-state', JSON.stringify(stored));
		} catch {
			// storage unavailable
		}
	}

	clearConversation(): void {
		const contact = this.selected();

		if (!contact) {
			return;
		}
		this.deleteTarget.set(contact);
		this.deleteOpen.set(true);
	}

	confirmClearConversation(): void {
		const contact = this.deleteTarget();

		if (!contact) {
			return;
		}
		this.messaging.deleteConversation(contact.login).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: () => {
				this.messages.set([]);
				this.relationship.set(null);
				this.deleteOpen.set(false);
				this.deleteTarget.set(null);
			},
			error: () => this.error.set('Не удалось удалить диалог.'),
		});
	}

	openGraph(): void {
		this.messaging.graph().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: (graph) => {
				this.graph.set(graph);
				this.graphOpen.set(true);
			},
			error: () => {
				this.graph.set({
					center: { login: this.selfLogin(), displayName: this.profile()?.user?.displayName ?? this.selfLogin() },
					nodes: this.contacts().map((contact) => ({
						login: contact.login,
						displayName: contact.displayName,
						avatar: contact.avatar,
						strength: 0,
						mutual: false,
						blocked: false,
						label: 'Незнакомец',
					})),
				});
				this.graphOpen.set(true);
			},
		});
	}

	closeGraph(): void {
		this.graphOpen.set(false);
	}

	pickGraphNode(login: string): void {
		const contact = this.contacts().find((item) => item.login === login);
		this.closeGraph();
		if (contact) {
			this.select(contact);
		}
	}

	strengthWidth(value: number): number {
		return Math.min(100, value * 10);
	}

	strokeWidth(value: number): number {
		return 1 + Math.min(5, value / 2);
	}

	private autoResize(): void {
		const textarea = this.composerInput()?.nativeElement;

		if (!textarea) {
			return;
		}
		textarea.style.height = 'auto';
		textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
	}

	private scrollToBottom(): void {
		setTimeout(() => {
			const element = this.messagesScroll()?.nativeElement;

			if (element) {
				element.scrollTop = element.scrollHeight;
			}
		});
	}

	formatTime(value: string): string {
		const date = new Date(value);

		return Number.isNaN(date.getTime())
			? '—'
			: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
	}

	mediaKind(media: MediaAttachment): string {
		return media.kind;
	}

	private async renderMessage(item: MessagingEnvelope, identity: Identity, peer: ReturnType<typeof contactBundle>): Promise<DisplayMessage> {
		try {
			const mine = item.sender === this.selfLogin();
			const text = await decryptMessage(
				identity,
				mine ? identity.bundle : peer,
				item.envelope,
				mine ? peer : undefined,
			);
			const parsed = parseMessageContent(text);

			return {
				id: item.id,
				mine: item.sender === this.selfLogin(),
				text,
				spans: parsed.spans,
				media: parsed.media,
				createdAt: item.createdAt,
				encrypted: item.envelope.algorithm !== 'PLAINTEXT',
				error: '',
				editedAt: item.editedAt,
				readAt: item.readAt,
				reactions: item.reactions ?? [],
			};
		} catch {
			return {
				id: item.id,
				mine: item.sender === this.selfLogin(),
				text: '',
				spans: [],
				media: [],
				createdAt: item.createdAt,
				encrypted: true,
				error: 'Не удалось расшифровать сообщение',
				reactions: item.reactions ?? [],
			};
		}
	}
}
