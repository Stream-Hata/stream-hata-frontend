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

const ACTIONS = ['say', 'announce', 'shoutout', 'raid', 'raid.cancel', 'marker', 'clip', 'delete', 'ban', 'unban', 'timeout', 'shield.on', 'shield.off', 'title.set', 'game.set', 'commercial', 'poll', 'poll.end', 'points.add', 'points.remove', 'points.set', 'points.balance', 'points.top', 'points.shop', 'points.redeem', 'music.add', 'music.current', 'lastmusic', 'wheel', 'games.slots', 'games.wheel', 'games.trivia', 'games.duel', 'games.accept', 'quote.add', 'quotes.random', 'dice', 'coinflip', 'random', 'variable.set', 'variable.inc', 'variable.dec', 'command.run', 'timer.start', 'timer.pause', 'timer.reset', 'timer.add', 'twitch.followage', 'twitch.accountage', 'twitch.uptime', 'twitch.viewers', 'twitch.title', 'twitch.game', 'twitch.followers', 'twitch.subscribers', 'twitch.chatters', 'widget.enable', 'widget.disable', 'widget.toggle', 'widget.config', 'alert.test', 'roulette.spin', 'reward.create', 'reward.update', 'reward.delete', 'reward.fulfill', 'mod.add', 'mod.remove', 'vip.add', 'vip.remove', 'chat.settings', 'random.number' ];
const ACTION_LABELS = ['Сообщение в чат', 'Анонс', 'Шаут', 'Рейд', 'Отменить рейд', 'Маркер стрима', 'Создать клип', 'Удалить сообщение', 'Бан', 'Разбан', 'Таймаут', 'Shield Mode вкл', 'Shield Mode выкл', 'Сменить заголовок', 'Сменить категорию', 'Реклама', 'Создать опрос', 'Завершить опрос', 'Начислить баллы', 'Снять баллы', 'Установить баллы', 'Мой баланс', 'Топ баллов', 'Магазин баллов', 'Купить награду', 'Добавить музыку', 'Текущая музыка', 'Ссылка на музыку', 'Колесо', 'Слоты', 'Колесо игры', 'Викторина', 'Дуэль', 'Принять дуэль', 'Добавить цитату', 'Случайная цитата', 'Кубик', 'Монетка', 'Случайный выбор', 'Установить переменную', 'Увеличить переменную', 'Уменьшить переменную', 'Запустить команду', 'Старт таймера', 'Пауза таймера', 'Сброс таймера', 'Изменить таймер', 'Дата фоллова', 'Возраст аккаунта', 'Аптайм стрима', 'Зрители', 'Заголовок', 'Категория', 'Фолловеры', 'Подписчики', 'Зрители в чате', 'Включить виджет', 'Выключить виджет', 'Переключить виджет', 'Настроить виджет (kind|json)', 'Тест алерта', 'Запустить рулетку', 'Создать награду', 'Обновить награду', 'Удалить награду', 'Выполнить награду', 'Добавить модератора', 'Снять модератора', 'Добавить VIP', 'Снять VIP', 'Настройки чата', 'Случайное число' ];
const LEVELS = ['everyone', 'subscriber', 'vip', 'moderator', 'broadcaster'];
const LEVEL_LABELS = ['Все', 'Сабы', 'VIP', 'Модераторы', 'Стример'];
const TRIGGER_ACTIONS = ['say', 'announce', 'shoutout', 'raid', 'raid.cancel', 'marker', 'clip', 'delete', 'ban', 'unban', 'timeout', 'shield.on', 'shield.off', 'title.set', 'game.set', 'commercial', 'poll', 'poll.end', 'points.add', 'points.remove', 'points.set', 'points.balance', 'points.top', 'points.shop', 'points.redeem', 'music.add', 'music.current', 'lastmusic', 'wheel', 'games.slots', 'games.wheel', 'games.trivia', 'games.duel', 'games.accept', 'quote.add', 'quotes.random', 'dice', 'coinflip', 'random', 'variable.set', 'variable.inc', 'variable.dec', 'command.run', 'timer.start', 'timer.pause', 'timer.reset', 'timer.add', 'twitch.followage', 'twitch.accountage', 'twitch.uptime', 'twitch.viewers', 'twitch.title', 'twitch.game', 'twitch.followers', 'twitch.subscribers', 'twitch.chatters', 'widget.enable', 'widget.disable', 'widget.toggle', 'widget.config', 'alert.test', 'roulette.spin', 'reward.create', 'reward.update', 'reward.delete', 'reward.fulfill', 'mod.add', 'mod.remove', 'vip.add', 'vip.remove', 'chat.settings', 'random.number' ];
const TRIGGER_LABELS: Record<string, string> = {
	'say': 'Сообщение в чат',
	'announce': 'Анонс',
	'shoutout': 'Шаут',
	'raid': 'Рейд',
	'raid.cancel': 'Отменить рейд',
	'marker': 'Маркер стрима',
	'clip': 'Создать клип',
	'delete': 'Удалить сообщение',
	'ban': 'Бан',
	'unban': 'Разбан',
	'timeout': 'Таймаут',
	'shield.on': 'Shield Mode вкл',
	'shield.off': 'Shield Mode выкл',
	'title.set': 'Сменить заголовок',
	'game.set': 'Сменить категорию',
	'commercial': 'Реклама',
	'poll': 'Создать опрос',
	'poll.end': 'Завершить опрос',
	'points.add': 'Начислить баллы',
	'points.remove': 'Снять баллы',
	'points.set': 'Установить баллы',
	'points.balance': 'Мой баланс',
	'points.top': 'Топ баллов',
	'points.shop': 'Магазин баллов',
	'points.redeem': 'Купить награду',
	'music.add': 'Добавить музыку',
	'music.current': 'Текущая музыка',
	'lastmusic': 'Ссылка на музыку',
	'wheel': 'Колесо',
	'games.slots': 'Слоты',
	'games.wheel': 'Колесо игры',
	'games.trivia': 'Викторина',
	'games.duel': 'Дуэль',
	'games.accept': 'Принять дуэль',
	'quote.add': 'Добавить цитату',
	'quotes.random': 'Случайная цитата',
	'dice': 'Кубик',
	'coinflip': 'Монетка',
	'random': 'Случайный выбор',
	'random.number': 'Случайное число',
	'variable.set': 'Установить переменную',
	'variable.inc': 'Увеличить переменную',
	'variable.dec': 'Уменьшить переменную',
	'command.run': 'Запустить команду',
	'timer.start': 'Старт таймера',
	'timer.pause': 'Пауза таймера',
	'timer.reset': 'Сброс таймера',
	'timer.add': 'Изменить таймер',
	'twitch.followage': 'Дата фоллова',
	'twitch.accountage': 'Возраст аккаунта',
	'twitch.uptime': 'Аптайм стрима',
	'twitch.viewers': 'Зрители',
	'twitch.title': 'Заголовок',
	'twitch.game': 'Категория',
	'twitch.followers': 'Фолловеры',
	'twitch.subscribers': 'Подписчики',
	'twitch.chatters': 'Зрители в чате',
	'widget.enable': 'Включить виджет',
	'widget.disable': 'Выключить виджет',
	'widget.toggle': 'Переключить виджет',
	'widget.config': 'Настроить виджет (kind|json)',
	'alert.test': 'Тест алерта',
	'roulette.spin': 'Запустить рулетку',
	'reward.create': 'Создать награду',
	'reward.update': 'Обновить награду',
	'reward.delete': 'Удалить награду',
	'reward.fulfill': 'Выполнить награду',
	'mod.add': 'Добавить модератора',
	'mod.remove': 'Снять модератора',
	'vip.add': 'Добавить VIP',
	'vip.remove': 'Снять VIP',
	'chat.settings': 'Настройки чата',
};
const VARIABLE_ACTIONS = ['', 'lastmusic', 'lasttrack', 'np', 'now', 'date', 'time', 'datetime', 'timestamp', 'random', 'random.number', 'dice', 'dice.name', 'dice.result', 'coinflip', 'points.balance', 'points.top', 'points.shop', 'twitch.followage', 'twitch.accountage', 'twitch.uptime', 'twitch.viewers', 'twitch.title', 'twitch.game', 'twitch.followers', 'twitch.subscribers', 'twitch.chatters', 'widget.enabled'];
const VARIABLE_ACTION_LABELS = ['Не использовать', 'Ссылка на текущую музыку', 'Ссылка на последний трек', 'Сейчас играет (URL)', 'Сейчас играет', 'Дата', 'Время', 'Дата и время', 'Unix timestamp', 'Случайное значение', 'Случайное число', 'Кубик', 'Имя кубика', 'Результат кубика', 'Монетка', 'Мой баланс баллов', 'Топ баллов', 'Магазин баллов', 'Дата фоллова', 'Возраст аккаунта', 'Аптайм стрима', 'Зрители', 'Заголовок канала', 'Категория', 'Фолловеры', 'Подписчики', 'Зрители в чате', 'Статус виджета'];

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
	readonly triggerActionLabels = TRIGGER_ACTIONS.map((item) => TRIGGER_LABELS[item] ?? item);
	readonly variableActionValues = VARIABLE_ACTIONS;
	readonly variableActionLabels = VARIABLE_ACTION_LABELS;
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
	readonly customVariables = signal<CommandVariable[]>([]);
	readonly variableItems = computed(() => [
		...['user', 'login', 'channel', 'count', 'date', 'time', 'now', 'lastmusic', 'lasttrack', 'np'].map((name) => `\${${name}}`),
		...this.customVariables().map((variable) => `\${${variable.name}}`),
	]);
	readonly actionHint = computed(() => this.hintFor(this.commandAction()));
	readonly variableHint = computed(() => this.hintFor(this.variableAction()));
	readonly commandRangeFrom = signal(1);
	readonly commandRangeTo = signal(100);
	readonly variableRangeFrom = signal(1);
	readonly variableRangeTo = signal(100);
	readonly error = signal('');
	readonly saved = signal(false);

	constructor() {
		void this.commands.variables().pipe(catchError(() => of({ variables: [] as CommandVariable[] }))).subscribe((response) => {
			this.customVariables.set(response.variables);
		});

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
				this.syncCommandRange();
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
				this.syncVariableRange();
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
				description: TRIGGER_LABELS[this.triggerAction()] ?? this.triggerAction(),
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

	private hintFor(action: string): string {
		switch (action) {
			case 'dice':
				return 'Формат: d100, 2d6, 1d20. Аргумент из чата имеет приоритет.';
			case 'dice.name':
				return 'Имя кубика берётся из сообщения (!dice d100), значение — запасной вариант.';
			case 'dice.result':
				return 'Значение задаёт конкретный кубик, например d100; иначе берётся из сообщения.';
			case 'random':
				return 'Варианты через | (да|нет|может) или диапазон 1-100.';
			case 'random.number':
				return 'Диапазон от и до; результат — целое число.';
			case 'coinflip':
				return 'Пусто — случайно; heads/tails (орёл/решка) — принудительно нужная сторона.';
			case 'poll':
				return 'Формат: вопрос | вариант 1 | вариант 2 | секунды.';
			case 'points.add':
			case 'points.remove':
			case 'points.set':
			case 'commercial':
				return 'Число: количество баллов или секунд.';
			case 'ban':
				return 'Формат: логин причина.';
			default:
				return '';
		}
	}

	insertVariable(value: string): void {
		this.commandReply.update((text) => {
			const separator = text && !text.endsWith(' ') ? ' ' : '';

			return text + separator + value;
		});
	}

	setType(index: number): void {
		this.type.set(TYPES[index]?.value ?? 'command');
	}

	setCommandAction(label: string): void {
		const index = ACTION_LABELS.indexOf(label);
		if (index >= 0) {
			this.commandAction.set(ACTIONS[index]);
			this.syncCommandRange();
		}
	}

	updateCommandRange(field: 'from' | 'to', value: number): void {
		if (field === 'from') this.commandRangeFrom.set(Math.min(value, this.commandRangeTo()));
		if (field === 'to') this.commandRangeTo.set(Math.max(value, this.commandRangeFrom()));
		this.commandValue.set(`${this.commandRangeFrom()}-${this.commandRangeTo()}`);
	}

	updateVariableRange(field: 'from' | 'to', value: number): void {
		if (field === 'from') this.variableRangeFrom.set(Math.min(value, this.variableRangeTo()));
		if (field === 'to') this.variableRangeTo.set(Math.max(value, this.variableRangeFrom()));
		this.variableValue.set(`${this.variableRangeFrom()}-${this.variableRangeTo()}`);
	}

	private syncCommandRange(): void {
		if (!['random', 'random.number'].includes(this.commandAction())) return;
		const range = this.parseRange(this.commandValue());
		if (range) {
			this.commandRangeFrom.set(range[0]);
			this.commandRangeTo.set(range[1]);
		} else if (!this.commandValue()) {
			this.commandValue.set('1-100');
		}
	}

	private syncVariableRange(): void {
		if (!['random', 'random.number'].includes(this.variableAction())) return;
		const range = this.parseRange(this.variableValue());
		if (range) {
			this.variableRangeFrom.set(range[0]);
			this.variableRangeTo.set(range[1]);
		} else if (!this.variableValue()) {
			this.variableValue.set('1-100');
		}
	}

	private parseRange(value: string): [number, number] | null {
		const match = value.trim().match(/^(-?\d+)\s*(?:-|\.\.|:)\s*(-?\d+)$/);
		if (!match) return null;
		const from = Number(match[1]);
		const to = Number(match[2]);
		return from <= to ? [from, to] : [to, from];
	}

	setCommandLevel(label: string): void {
		const index = LEVEL_LABELS.indexOf(label);
		if (index >= 0) this.commandLevel.set(LEVELS[index]);
	}

	setTriggerAction(label: string): void {
		const index = this.triggerActionLabels.indexOf(label);
		if (index >= 0) this.triggerAction.set(TRIGGER_ACTIONS[index]);
	}

	setVariableAction(label: string): void {
		const index = this.variableActionLabels.indexOf(label);
		if (index >= 0) {
			this.variableAction.set(this.variableActionValues[index]);
			this.syncVariableRange();
		}
	}
}
