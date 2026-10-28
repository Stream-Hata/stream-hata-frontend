import type { TelegramButton, TelegramCommand } from '@shared/types/automation';
import type { NotifySettings } from '@shared/types/stream';
import { Component, inject, signal } from '@angular/core';
import { CommandsService } from '@shared/services/commands.service';
import { NotifyService } from '@shared/services/stream.services';
import { TuiButton, TuiInput, TuiTextfield } from '@taiga-ui/core';
import { TuiSwitch, TuiTextarea } from '@taiga-ui/kit';

@Component({
	imports: [TuiButton, TuiInput, TuiSwitch, TuiTextarea, TuiTextfield],
	selector: 'app-telegram-bot-page',
	styleUrl: './telegram-bot-page.scss',
	templateUrl: './telegram-bot-page.html',
})
export default class TelegramBotPage {
	private readonly commandsService = inject(CommandsService);
	private readonly notify = inject(NotifyService);

	readonly settings = signal<NotifySettings | null>(null);
	readonly commands = signal<TelegramCommand[]>([]);
	readonly chats = signal<{ id: number; title?: string; username?: string }[]>([]);
	readonly newChatId = signal('');
	readonly status = signal('');
	readonly editingId = signal<string | null>(null);
	readonly command = signal('/start');
	readonly response = signal('');
	readonly enabled = signal(true);
	readonly buttons = signal<TelegramButton[]>([]);

	constructor() {
		this.load();
	}

	load(): void {
		this.notify.settings().subscribe((settings) => {
			this.settings.set(settings);
			if (!settings.telegramChatIds?.length && settings.telegramChatId) {
				this.settings.set({ ...settings, telegramChatIds: [settings.telegramChatId] });
			}
		});
		this.reloadCommands();
	}

	reloadCommands(): void {
		this.commandsService.telegramCommands().subscribe(({ commands }) => {
			this.commands.set(commands ?? []);
		});
	}

	updateSettings(field: keyof NotifySettings, value: string | boolean): void {
		const current = this.settings();

		if (current) {
			this.settings.set({ ...current, [field]: value });
		}
	}

	addChatID(id = this.newChatId()): void {
		const value = id.trim();
		const current = this.settings();

		if (!value || !current) {
			return;
		}

		const ids = [...(current.telegramChatIds ?? []), value].filter(
			(item, index, list) => list.indexOf(item) === index,
		);
		this.settings.set({ ...current, telegramChatId: ids[0] ?? '', telegramChatIds: ids });
		this.newChatId.set('');
	}

	removeChatID(id: string): void {
		const current = this.settings();

		if (!current) {
			return;
		}

		const ids = (current.telegramChatIds ?? []).filter((item) => item !== id);
		this.settings.set({ ...current, telegramChatId: ids[0] ?? '', telegramChatIds: ids });
	}

	saveSettings(): void {
		const current = this.settings();

		if (!current) {
			return;
		}

		this.notify.save(current).subscribe({
			next: (settings) => {
				this.settings.set(settings);
				this.status.set('Настройки бота сохранены');
			},
			error: () => this.status.set('Не удалось сохранить настройки'),
		});
	}

	loadChats(): void {
		this.notify.chats().subscribe({
			next: ({ chats }) => this.chats.set(chats),
			error: () => this.status.set('Не удалось получить чаты'),
		});
	}

	test(): void {
		this.notify.test().subscribe({
			next: () => this.status.set('Тестовое сообщение отправлено'),
			error: () => this.status.set('Тест не прошёл: проверь токен и chat id'),
		});
	}

	edit(item: TelegramCommand): void {
		this.editingId.set(item.id);
		this.command.set(item.command);
		this.response.set(item.response);
		this.enabled.set(item.enabled);
		this.buttons.set([...(item.buttons ?? [])]);
	}

	reset(): void {
		this.editingId.set(null);
		this.command.set('/start');
		this.response.set('');
		this.enabled.set(true);
		this.buttons.set([]);
	}

	addButton(): void {
		this.buttons.update((items) => [...items, { text: '', url: '' }]);
	}

	updateButton(index: number, field: keyof TelegramButton, event: Event): void {
		const value = (event.target as HTMLInputElement).value;

		this.buttons.update((items) =>
			items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
		);
	}

	removeButton(index: number): void {
		this.buttons.update((items) => items.filter((_, itemIndex) => itemIndex !== index));
	}

	save(): void {
		if (!this.command().trim()) {
			this.status.set('Укажи команду, например /start');
			return;
		}

		this.commandsService
			.saveTelegramCommand({
				id: this.editingId() ?? undefined,
				command: this.command().trim(),
				response: this.response(),
				enabled: this.enabled(),
				buttons: this.buttons().filter((item) => item.text.trim() && item.url.trim()),
			})
			.subscribe({
				next: () => {
					this.status.set('Команда сохранена');
					this.reset();
					this.reloadCommands();
				},
				error: () => this.status.set('Не удалось сохранить команду'),
			});
	}

	remove(id: string): void {
		this.commandsService.removeTelegramCommand(id).subscribe(() => this.reloadCommands());
	}
}
