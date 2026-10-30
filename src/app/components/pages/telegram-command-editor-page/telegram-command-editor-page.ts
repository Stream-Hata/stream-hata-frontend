/* eslint-disable max-len */
import type { TelegramButton, TelegramCommand } from '@shared/types/automation';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommandsService } from '@shared/services/commands.service';
import { TuiButton, TuiDropdown, TuiInput, TuiSelectLike, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiDataListWrapper } from '@taiga-ui/kit';
import { TuiSwitch, TuiTextarea } from '@taiga-ui/kit';
import { TELEGRAM_ACTION_LABELS, TELEGRAM_ACTIONS } from '@shared/config/telegram-actions';

@Component({
	imports: [RouterLink, TuiButton, TuiChevron, TuiDataListWrapper, TuiDropdown, TuiInput, TuiSelectLike, TuiSwitch, TuiTextarea, TuiTextfield],
	selector: 'app-telegram-command-editor-page',
	styleUrl: './telegram-command-editor-page.scss',
	templateUrl: './telegram-command-editor-page.html',
})
export default class TelegramCommandEditorPage {
	private readonly commands = inject(CommandsService);
	private readonly router = inject(Router);
	private readonly id = inject(ActivatedRoute).snapshot.queryParamMap.get('id');

	readonly command = signal('/start');
	readonly name = signal('');
	readonly aliases = signal('');
	readonly description = signal('');
	readonly action = signal('reply');
	readonly actionValues = TELEGRAM_ACTIONS;
	readonly actionLabels = TELEGRAM_ACTIONS.map((action) => TELEGRAM_ACTION_LABELS[action] ?? action);
	readonly actionLabel = computed(() => TELEGRAM_ACTION_LABELS[this.action()] ?? this.action());
	readonly deleteCommand = signal(false);
	readonly response = signal('');
	readonly responsePrivate = signal('');
	readonly responseChannel = signal('');
	readonly responseGroup = signal('');
	readonly chain = signal('');
	readonly parseMode = signal('');
	readonly disablePreview = signal(false);
	readonly enabled = signal(true);
	readonly buttons = signal<TelegramButton[]>([]);
	readonly error = signal('');

	constructor() {
		if (this.id) {
			this.commands.telegramCommands().subscribe(({ commands }) => {
				const item = (commands ?? []).find((command) => command.id === this.id);

				if (item) {
					this.apply(item);
				}
			});
		}
	}

	apply(item: TelegramCommand): void {
		this.command.set(item.command);
		this.name.set(item.name ?? '');
		this.aliases.set((item.aliases ?? []).join(', '));
		this.description.set(item.description ?? '');
		this.action.set(item.action ?? 'reply');
		this.deleteCommand.set(Boolean(item.deleteCommand));
		this.response.set(item.response);
		this.responsePrivate.set(item.responsePrivate ?? '');
		this.responseChannel.set(item.responseChannel ?? '');
		this.responseGroup.set(item.responseGroup ?? '');
		this.chain.set((item.chain ?? []).join(', '));
		this.parseMode.set(item.parseMode ?? '');
		this.disablePreview.set(Boolean(item.disablePreview));
		this.enabled.set(item.enabled);
		this.buttons.set([...(item.buttons ?? [])]);
	}

	addButton(): void {
		this.buttons.update((items) => [
			...items,
			{ text: '', url: '', callback: '', callbackResponse: '', color: '#2ea6ff' },
		]);
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

	setAction(label: string): void {
		const index = this.actionLabels.indexOf(label);
		if (index >= 0) {
			this.action.set(this.actionValues[index]);
		}
	}

	save(): void {
		if (!this.command().trim()) {
			this.error.set('Укажи команду, например /start');
			return;
		}

		this.commands
			.saveTelegramCommand({
				id: this.id ?? undefined,
				command: this.command().trim(),
				name: this.name().trim(),
				aliases: this.aliases()
					.split(',')
					.map((item) => item.trim())
					.filter(Boolean),
				description: this.description().trim(),
				action: this.action().trim() || 'reply',
				deleteCommand: this.deleteCommand(),
				response: this.response(),
				responsePrivate: this.responsePrivate(),
				responseChannel: this.responseChannel(),
				responseGroup: this.responseGroup(),
				chain: this.chain().split(',').map((item) => item.trim()).filter(Boolean),
				parseMode: this.parseMode(),
				disablePreview: this.disablePreview(),
				enabled: this.enabled(),
				buttons: this.buttons().filter(
					(item) => item.text.trim() && (item.url?.trim() || item.callback?.trim()),
				),
			})
			.subscribe({
				next: () => void this.router.navigate(['/app/telegram']),
				error: () => this.error.set('Не удалось сохранить команду'),
			});
	}
}
