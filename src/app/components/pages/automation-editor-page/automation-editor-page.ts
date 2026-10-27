import type { ChatCommand, CommandVariable, Trigger } from '@shared/types/automation';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommandsService } from '@shared/services/commands.service';
import { TriggersService } from '@shared/services/ops.services';
import { AppSettingsService } from '@shared/services/app-settings.service';
import { TuiButton, TuiDropdown, TuiInput, TuiSelectLike, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiDataListWrapper, TuiSwitch, TuiTextarea } from '@taiga-ui/kit';
import { catchError, firstValueFrom, of } from 'rxjs';

type EditorType = 'command' | 'trigger' | 'variable';

const TYPES: { value: EditorType; label: string }[] = [
	{ value: 'command', label: 'Команда' },
	{ value: 'trigger', label: 'Триггер' },
	{ value: 'variable', label: 'Переменная' },
];

const ACTIONS = ['say', 'lastmusic', 'music', 'clip', 'points', 'timeout', 'wheel', 'twitch.followage', 'twitch.accountage', 'twitch.uptime', 'twitch.viewers', 'twitch.title', 'twitch.game'];
const ACTION_LABELS = ['Сообщение в чат', 'Ссылка на музыку', 'Добавить музыку', 'Создать клип', 'Баллы', 'Таймаут', 'Колесо', 'Дата фоллова', 'Возраст аккаунта', 'Аптайм стрима', 'Зрители', 'Заголовок', 'Категория'];
const LEVELS = ['everyone', 'subscriber', 'vip', 'moderator', 'broadcaster'];
const LEVEL_LABELS = ['Все', 'Сабы', 'VIP', 'Модераторы', 'Стример'];
const TRIGGER_ACTIONS = [
	'points.balance', 'points.top', 'points.shop', 'points.redeem', 'games.slots', 'games.wheel',
	'games.trivia', 'games.duel', 'games.accept', 'quotes.quote', 'jury.yea', 'jury.nei',
	'clips.clip', 'music.add',
];

@Component({
	imports: [RouterLink, TuiButton, TuiChevron, TuiDataListWrapper, TuiDropdown, TuiInput, TuiSelectLike, TuiSwitch, TuiTextarea, TuiTextfield],
	selector: 'app-automation-editor-page',
	templateUrl: './automation-editor-page.html',
	styleUrl: './automation-editor-page.scss',
})
export default class AutomationEditorPage {
	private readonly commands = inject(CommandsService);
	private readonly triggers = inject(TriggersService);
	readonly accent = inject(AppSettingsService).accent;
	private readonly router = inject(Router);
	private readonly id = new URLSearchParams(location.search).get('id');

	readonly types = TYPES;
	readonly type = signal<EditorType>((new URLSearchParams(location.search).get('type') as EditorType) || 'command');
	readonly typeIndex = computed(() => TYPES.findIndex((item) => item.value === this.type()));
	readonly actions = ACTIONS;
	readonly actionLabels = ACTION_LABELS;
	readonly levels = LEVELS;
	readonly levelLabels = LEVEL_LABELS;
	readonly triggerActions = TRIGGER_ACTIONS;
	readonly triggerActionLabels = TRIGGER_ACTIONS.map((item) => item);
	readonly commandAction = signal('say');
	readonly commandName = signal('');
	readonly commandAliases = signal('');
	readonly commandValue = signal('');
	readonly commandReply = signal('');
	readonly commandCooldown = signal(5);
	readonly commandLevel = signal('everyone');
	readonly commandEnabled = signal(true);
	readonly triggerAction = signal(TRIGGER_ACTIONS[0]);
	readonly triggerCommand = signal('');
	readonly triggerAliases = signal('');
	readonly triggerEnabled = signal(true);
	readonly variableName = signal('');
	readonly variableValue = signal('');
	readonly variableAction = signal('');
	readonly error = signal('');
	readonly saved = signal(false);

	constructor() {
		if (this.id) {
			void this.load();
		}
	}

	async load(): Promise<void> {
		if (this.type() === 'command') {
			const response = await firstValueFrom(this.commands.list().pipe(catchError(() => of({ commands: [] as ChatCommand[] }))));
			const command = response.commands.find((item) => item.id === this.id);
			if (command) {
				this.commandName.set(command.name);
				this.commandAliases.set(command.aliases.join(', '));
				this.commandAction.set(command.action || 'say');
				this.commandValue.set(command.response);
				this.commandReply.set(command.reply ?? '');
				this.commandCooldown.set(command.cooldownSeconds);
				this.commandLevel.set(command.userLevel);
				this.commandEnabled.set(command.enabled);
			}
		}

		if (this.type() === 'trigger') {
			const response = await firstValueFrom(this.triggers.list().pipe(catchError(() => of({ triggers: [] as Trigger[] }))));
			const trigger = response.triggers.find((item) => item.action === this.id);
			if (trigger) {
				this.triggerAction.set(trigger.action);
				this.triggerCommand.set(trigger.command);
				this.triggerAliases.set(trigger.aliases.join(', '));
				this.triggerEnabled.set(trigger.enabled);
			}
		}

		if (this.type() === 'variable') {
			const response = await firstValueFrom(this.commands.variables().pipe(catchError(() => of({ variables: [] as CommandVariable[] }))));
			const variable = response.variables.find((item) => item.id === this.id);
			if (variable) {
				this.variableName.set(variable.name);
				this.variableValue.set(variable.value);
				this.variableAction.set(variable.action);
			}
		}
	}

	async save(): Promise<void> {
		this.error.set('');

		if (this.type() === 'command') {
			if (!this.commandName().trim()) {
				this.error.set('Укажите имя команды');
				return;
			}
			await firstValueFrom(this.commands.save({
				id: this.id ?? undefined,
				name: this.commandName().trim(),
				aliases: this.commandAliases().split(',').map((item) => item.trim()).filter(Boolean),
				action: this.commandAction(),
				response: this.commandValue().trim(),
				reply: this.commandReply().trim(),
				cooldownSeconds: this.commandCooldown(),
				userLevel: this.commandLevel(),
				enabled: this.commandEnabled(),
			}));
		}

		if (this.type() === 'trigger') {
			const response = await firstValueFrom(this.triggers.list().pipe(catchError(() => of({ triggers: [] as Trigger[] }))));
			const list = response.triggers.filter((item) => item.action !== this.triggerAction());
			list.push({
				action: this.triggerAction(),
				command: this.triggerCommand().trim(),
				aliases: this.triggerAliases().split(',').map((item) => item.trim()).filter(Boolean),
				enabled: this.triggerEnabled(),
				description: this.triggerAction(),
			});
			await firstValueFrom(this.triggers.save(list));
		}

		if (this.type() === 'variable') {
			if (!this.variableName().trim()) {
				this.error.set('Укажите имя переменной');
				return;
			}
			await firstValueFrom(this.commands.saveVariable({
				id: this.id ?? undefined,
				name: this.variableName().trim(),
				value: this.variableValue(),
				action: this.variableAction().trim(),
			}));
		}

		this.saved.set(true);
		await this.router.navigateByUrl('/app/commands');
	}

	setType(index: number): void {
		this.type.set(TYPES[index]?.value ?? 'command');
	}

	setCommandAction(label: string): void {
		const index = ACTION_LABELS.indexOf(label);
		if (index >= 0) this.commandAction.set(ACTIONS[index]);
	}

	setCommandLevel(label: string): void {
		const index = LEVEL_LABELS.indexOf(label);
		if (index >= 0) this.commandLevel.set(LEVELS[index]);
	}

	setTriggerAction(value: string): void {
		this.triggerAction.set(value);
	}
}
