import type { ChatCommand, CommandVariable, MessageTimer, Trigger, TwitchReward, TwitchRewardsState } from '@shared/types/automation';
import { Component, computed, DestroyRef, effect, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { CommandsService } from '@shared/services/commands.service';
import { I18nService } from '@shared/services/i18n.service';
import { AppSettingsService } from '@shared/services/app-settings.service';
import { RouterLink } from '@angular/router';
import { signalControl } from '@shared/helpers/form-control';
import { TriggersService } from '@shared/services/ops.services';
import {
	TuiTable,
	TuiTableTbody,
	TuiTableTd,
	TuiTableTh,
	TuiTableThead,
} from '@taiga-ui/addon-table';
import {
	TuiButton,
	TuiDropdown,
	TuiIcon,
	TuiInput,
	tuiItemsHandlersProvider,
	TuiSelectLike,
	TuiTextfield,
} from '@taiga-ui/core';
import {
	TuiInputNumber, TuiBadge, TuiChevron, TuiDataListWrapper, TuiSwitch, TuiTextarea } from '@taiga-ui/kit';
import { catchError, merge, of, switchMap, timer } from 'rxjs';

const TRIGGER_ACTIONS: { action: string; description: string }[] = [
	{ action: 'say', description: 'Сообщение в чат' },
	{ action: 'announce', description: 'Анонс' },
	{ action: 'shoutout', description: 'Шаут' },
	{ action: 'raid', description: 'Рейд' },
	{ action: 'raid.cancel', description: 'Отменить рейд' },
	{ action: 'marker', description: 'Маркер стрима' },
	{ action: 'clip', description: 'Создать клип' },
	{ action: 'delete', description: 'Удалить сообщение' },
	{ action: 'ban', description: 'Бан' },
	{ action: 'unban', description: 'Разбан' },
	{ action: 'timeout', description: 'Таймаут' },
	{ action: 'shield.on', description: 'Shield Mode вкл' },
	{ action: 'shield.off', description: 'Shield Mode выкл' },
	{ action: 'title.set', description: 'Сменить заголовок' },
	{ action: 'game.set', description: 'Сменить категорию' },
	{ action: 'commercial', description: 'Реклама' },
	{ action: 'poll', description: 'Создать опрос' },
	{ action: 'poll.end', description: 'Завершить опрос' },
	{ action: 'points.add', description: 'Начислить баллы' },
	{ action: 'points.remove', description: 'Снять баллы' },
	{ action: 'points.set', description: 'Установить баллы' },
	{ action: 'points.balance', description: 'Мой баланс' },
	{ action: 'points.top', description: 'Топ баллов' },
	{ action: 'points.shop', description: 'Магазин баллов' },
	{ action: 'points.redeem', description: 'Купить награду' },
	{ action: 'music.add', description: 'Добавить музыку' },
	{ action: 'music.current', description: 'Текущая музыка' },
	{ action: 'lastmusic', description: 'Ссылка на музыку' },
	{ action: 'wheel', description: 'Колесо' },
	{ action: 'games.slots', description: 'Слоты' },
	{ action: 'games.wheel', description: 'Колесо игры' },
	{ action: 'games.trivia', description: 'Викторина' },
	{ action: 'games.duel', description: 'Дуэль' },
	{ action: 'games.accept', description: 'Принять дуэль' },
	{ action: 'quote.add', description: 'Добавить цитату' },
	{ action: 'quotes.random', description: 'Случайная цитата' },
	{ action: 'dice', description: 'Кубик' },
	{ action: 'coinflip', description: 'Монетка' },
	{ action: 'random', description: 'Случайный выбор' },
	{ action: 'random.number', description: 'Случайное число' },
	{ action: 'variable.set', description: 'Установить переменную' },
	{ action: 'variable.inc', description: 'Увеличить переменную' },
	{ action: 'variable.dec', description: 'Уменьшить переменную' },
	{ action: 'command.run', description: 'Запустить команду' },
	{ action: 'timer.start', description: 'Старт таймера' },
	{ action: 'timer.pause', description: 'Пауза таймера' },
	{ action: 'timer.reset', description: 'Сброс таймера' },
	{ action: 'timer.add', description: 'Изменить таймер' },
	{ action: 'twitch.followage', description: 'Дата фоллова' },
	{ action: 'twitch.accountage', description: 'Возраст аккаунта' },
	{ action: 'twitch.uptime', description: 'Аптайм стрима' },
	{ action: 'twitch.viewers', description: 'Зрители' },
	{ action: 'twitch.title', description: 'Заголовок' },
	{ action: 'twitch.game', description: 'Категория' },
	{ action: 'twitch.followers', description: 'Фолловеры' },
	{ action: 'twitch.subscribers', description: 'Подписчики' },
	{ action: 'twitch.chatters', description: 'Зрители в чате' },
	{ action: 'widget.enable', description: 'Включить виджет' },
	{ action: 'widget.disable', description: 'Выключить виджет' },
	{ action: 'widget.toggle', description: 'Переключить виджет' },
	{ action: 'widget.config', description: 'Настроить виджет (kind|json)' },
	{ action: 'alert.test', description: 'Тест алерта' },
	{ action: 'roulette.spin', description: 'Запустить рулетку' },
	{ action: 'reward.create', description: 'Создать награду' },
	{ action: 'reward.update', description: 'Обновить награду' },
	{ action: 'reward.delete', description: 'Удалить награду' },
	{ action: 'reward.fulfill', description: 'Выполнить награду' },
	{ action: 'mod.add', description: 'Добавить модератора' },
	{ action: 'mod.remove', description: 'Снять модератора' },
	{ action: 'vip.add', description: 'Добавить VIP' },
	{ action: 'vip.remove', description: 'Снять VIP' },
	{ action: 'chat.settings', description: 'Настройки чата' },
];

const ACTION_LABELS: Record<string, string> = {
	say: 'Сообщение в чат',
	points: 'Начислить баллы',
	timeout: 'Таймаут',
	wheel: 'Колесо',
	music: 'Добавить музыку',
	clip: 'Создать клип',
};

const LEVEL_LABELS: Record<string, string> = {
	everyone: 'Все',
	subscriber: 'Сабы',
	vip: 'VIP',
	moderator: 'Модеры',
	broadcaster: 'Стример',
};

@Component({
	imports: [
		RouterLink,
		TuiInputNumber,ReactiveFormsModule,
		TuiChevron,
		TuiDataListWrapper,
		TuiSelectLike,
		TuiBadge,
		TuiButton,
		TuiDropdown,
		TuiIcon,
		TuiInput,
		TuiSwitch,
		TuiTable,
		TuiTableTbody,
		TuiTableTd,
		TuiTableTh,
		TuiTableThead,
		TuiTextarea,
		TuiTextfield,
	],
	selector: 'app-commands-page',
	providers: [
		tuiItemsHandlersProvider({
			stringify: signal((value: string) => LEVEL_LABELS[value] ?? value),
		}),
	],
	styleUrl: './commands-page.scss',
	templateUrl: './commands-page.html',
})
export default class CommandsPage {
	private readonly service = inject(CommandsService);
	readonly i18n = inject(I18nService);
	readonly accent = inject(AppSettingsService).accent;
	private readonly triggersService = inject(TriggersService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly injector = inject(Injector);

	readonly tab = signal<'commands' | 'timers' | 'triggers' | 'rewards' | 'variables'>('commands');
	readonly refresh = signal(0);

	readonly commands = toSignal(
		merge(timer(0, 10000), toObservable(this.refresh)).pipe(
			switchMap(() => this.service.list().pipe(catchError(() => of({ commands: [] })))),
		),
		{ initialValue: { commands: [] as ChatCommand[] } },
	);

	readonly twitchRewards = toSignal(
		merge(timer(0, 15000), toObservable(this.refresh)).pipe(
			switchMap(() =>
				this.service.rewards().pipe(
					catchError(() => of({ rewards: [], mappings: [] } as TwitchRewardsState)),
				),
			),
		),
		{ initialValue: { rewards: [], mappings: [] } as TwitchRewardsState },
	);

	readonly timers = toSignal(
		merge(timer(0, 10000), toObservable(this.refresh)).pipe(
			switchMap(() => this.service.timers().pipe(catchError(() => of({ timers: [] })))),
		),
		{ initialValue: { timers: [] as MessageTimer[] } },
	);

	/* Форма команды */
	readonly editingId = signal<string | null>(null);
	readonly name = signal('');
	readonly response = signal('');
	readonly reply = signal('');
	readonly aliases = signal('');
	readonly cooldown = signal(5);
	readonly action = signal('say');
	readonly actionControl = signalControl(this.action, this.injector);
	readonly builtInVariables = ['$(user)', '$(login)', '$(channel)', '$(count)', '$(date)', '$(time)', '$(now)', '$(lastmusic)', '$(lasttrack)', '$(np)'];
	readonly customVariables = toSignal(
		merge(timer(0, 15000), toObservable(this.refresh)).pipe(
			switchMap(() => this.service.variables().pipe(catchError(() => of({ variables: [] as CommandVariable[] })))),
		),
		{ initialValue: { variables: [] as CommandVariable[] } },
	);
	readonly variables = computed(() => [
		...this.builtInVariables,
		...this.customVariables().variables.map((variable) => `$(${variable.name})`),
	]);
	readonly variableEditingId = signal<string | null>(null);
	readonly variableName = signal('');
	readonly variableValue = signal('');
	readonly variableAction = signal('');
	readonly variableActionControl = signalControl(this.variableAction, this.injector);
	readonly variableActionValues = ['', 'lastmusic', 'lasttrack', 'np', 'now', 'date', 'time', 'datetime', 'timestamp', 'random', 'random.number', 'dice', 'dice.name', 'dice.result', 'coinflip', 'points.balance', 'points.top', 'points.shop', 'twitch.followage', 'twitch.accountage', 'twitch.uptime', 'twitch.viewers', 'twitch.title', 'twitch.game', 'twitch.followers', 'twitch.subscribers', 'twitch.chatters', 'widget.enabled'];
	readonly variableActionLabels = ['Не использовать', 'Ссылка на текущую музыку', 'Ссылка на последний трек', 'Сейчас играет (URL)', 'Сейчас играет', 'Дата', 'Время', 'Дата и время', 'Unix timestamp', 'Случайное значение', 'Случайное число', 'Кубик', 'Имя кубика', 'Результат кубика', 'Монетка', 'Мой баланс баллов', 'Топ баллов', 'Магазин баллов', 'Дата фоллова', 'Возраст аккаунта', 'Аптайм стрима', 'Зрители', 'Заголовок канала', 'Категория', 'Фолловеры', 'Подписчики', 'Зрители в чате', 'Статус виджета'];
	readonly actionValues = ['say', 'announce', 'shoutout', 'raid', 'raid.cancel', 'marker', 'clip', 'delete', 'ban', 'unban', 'timeout', 'shield.on', 'shield.off', 'title.set', 'game.set', 'commercial', 'poll', 'poll.end', 'points.add', 'points.remove', 'points.set', 'points.balance', 'points.top', 'points.shop', 'points.redeem', 'music.add', 'music.current', 'lastmusic', 'wheel', 'games.slots', 'games.wheel', 'games.trivia', 'games.duel', 'games.accept', 'quote.add', 'quotes.random', 'dice', 'coinflip', 'random', 'random.number', 'variable.set', 'variable.inc', 'variable.dec', 'command.run', 'timer.start', 'timer.pause', 'timer.reset', 'timer.add', 'twitch.followage', 'twitch.accountage', 'twitch.uptime', 'twitch.viewers', 'twitch.title', 'twitch.game', 'twitch.followers', 'twitch.subscribers', 'twitch.chatters', 'widget.enable', 'widget.disable', 'widget.toggle', 'widget.config', 'alert.test', 'roulette.spin', 'reward.create', 'reward.update', 'reward.delete', 'reward.fulfill', 'mod.add', 'mod.remove', 'vip.add', 'vip.remove', 'chat.settings' ];
	readonly actionLabels = ['Сообщение в чат', 'Анонс', 'Шаут', 'Рейд', 'Отменить рейд', 'Маркер стрима', 'Создать клип', 'Удалить сообщение', 'Бан', 'Разбан', 'Таймаут', 'Shield Mode вкл', 'Shield Mode выкл', 'Сменить заголовок', 'Сменить категорию', 'Реклама', 'Создать опрос', 'Завершить опрос', 'Начислить баллы', 'Снять баллы', 'Установить баллы', 'Мой баланс', 'Топ баллов', 'Магазин баллов', 'Купить награду', 'Добавить музыку', 'Текущая музыка', 'Ссылка на музыку', 'Колесо', 'Слоты', 'Колесо игры', 'Викторина', 'Дуэль', 'Принять дуэль', 'Добавить цитату', 'Случайная цитата', 'Кубик', 'Монетка', 'Случайный выбор', 'Случайное число', 'Установить переменную', 'Увеличить переменную', 'Уменьшить переменную', 'Запустить команду', 'Старт таймера', 'Пауза таймера', 'Сброс таймера', 'Изменить таймер', 'Дата фоллова', 'Возраст аккаунта', 'Аптайм стрима', 'Зрители', 'Заголовок', 'Категория', 'Фолловеры', 'Подписчики', 'Зрители в чате', 'Включить виджет', 'Выключить виджет', 'Переключить виджет', 'Настроить виджет (kind|json)', 'Тест алерта', 'Запустить рулетку', 'Создать награду', 'Обновить награду', 'Удалить награду', 'Выполнить награду', 'Добавить модератора', 'Снять модератора', 'Добавить VIP', 'Снять VIP', 'Настройки чата' ];
	readonly level = signal('everyone');
	readonly levelControl = signalControl(this.level, this.injector);
	readonly levelValues = ['everyone', 'subscriber', 'vip', 'moderator', 'broadcaster'];
	readonly levelLabels = ['Все', 'Сабы', 'VIP', 'Модеры', 'Стример'];
	readonly testResult = signal<string | null>(null);
	readonly error = signal<string | null>(null);
	readonly commandOverrides = signal<Record<string, boolean>>({});
	readonly timerOverrides = signal<Record<string, boolean>>({});

	/* Форма награды */
	readonly rewardEditingId = signal<string | null>(null);
	readonly rewardTitle = signal('');
	readonly rewardCost = signal(100);
	readonly rewardPrompt = signal('');
	readonly rewardEnabled = signal(true);
	readonly rewardAction = signal('say');
	readonly rewardPayload = signal('');
	readonly rewardActionValues = ['say', 'points', 'timeout', 'wheel', 'command', 'lastmusic'];
	readonly rewardActionLabels = ['Сообщение в чат', 'Начислить баллы', 'Таймаут', 'Колесо', 'Выполнить команду', 'Ссылка на текущую музыку'];
	readonly commandLabels = computed(() => this.commands().commands.map((command) => `!${command.name}`));
	readonly rewardCommandLabel = computed(() => {
		const command = this.commands().commands.find((item) => item.id === this.rewardPayload());

		return command ? `!${command.name}` : '— выберите команду —';
	});

	/* Форма таймера */
	readonly timerEditingId = signal<string | null>(null);
	readonly timerName = signal('');
	readonly timerText = signal('');
	readonly timerInterval = signal(10);
	readonly timerActiveOnly = signal(true);
	readonly timerActiveOnlyControl = signalControl(this.timerActiveOnly, this.injector);
	readonly timerRandom = signal(false);
	readonly timerRandomControl = signalControl(this.timerRandom, this.injector);

	readonly editing = computed(() => this.editingId() !== null);

	editReward(reward: TwitchReward): void {
		const mapping = this.twitchRewards().mappings.find(
			(item) => item.id === reward.id || item.rewardTitle === reward.title,
		);

		this.rewardEditingId.set(reward.id);
		this.rewardTitle.set(reward.title);
		this.rewardCost.set(reward.cost);
		this.rewardPrompt.set(reward.prompt);
		this.rewardEnabled.set(reward.is_enabled);
		this.rewardAction.set(mapping?.action ?? 'say');
		this.rewardPayload.set(mapping?.payload ?? '');
	}

	resetRewardForm(): void {
		this.rewardEditingId.set(null);
		this.rewardTitle.set('');
		this.rewardCost.set(100);
		this.rewardPrompt.set('');
		this.rewardEnabled.set(true);
		this.rewardAction.set('say');
		this.rewardPayload.set('');
	}

	saveReward(): void {
		const title = this.rewardTitle().trim();

		if (!title || this.rewardCost() < 1) {
			this.error.set('Укажите название и цену награды');

			return;
		}

		this.service
			.saveReward({
				id: this.rewardEditingId() ?? undefined,
				title,
				cost: this.rewardCost(),
				prompt: this.rewardPrompt().trim(),
				is_enabled: this.rewardEnabled(),
				action: this.rewardAction(),
				payload: this.rewardPayload(),
			})
			.subscribe({
				next: () => {
					this.resetRewardForm();
					this.refresh.update((value) => value + 1);
				},
				error: (response) => this.error.set(response.error?.error ?? 'Не удалось сохранить награду'),
			});
	}

	removeReward(id: string): void {
		this.service.removeReward(id).subscribe(() => this.refresh.update((value) => value + 1));
	}

	rewardMapping(reward: TwitchReward) {
		return this.twitchRewards().mappings.find(
			(item) => item.id === reward.id || item.rewardTitle === reward.title,
		);
	}

	/* Триггеры */
	readonly triggers = toSignal(
		this.triggersService.list().pipe(catchError(() => of({ triggers: [] as Trigger[] }))),
		{ initialValue: { triggers: [] as Trigger[] } },
	);

	readonly triggerDraft = signal<Trigger[]>([]);
	readonly triggerActions = TRIGGER_ACTIONS;
	readonly triggerAction = signal(TRIGGER_ACTIONS[0].action);
	readonly triggerActionControl = signalControl(this.triggerAction, this.injector);
	readonly triggerActionValues = TRIGGER_ACTIONS.map((item) => item.action);
	readonly triggerActionLabels = TRIGGER_ACTIONS.map((item) => item.description);
	readonly triggersSaved = signal(false);
	private triggersLoaded = false;

	constructor() {
		effect(() => {
			const list = this.triggers().triggers;

			if (list.length && !this.triggersLoaded) {
				this.triggersLoaded = true;
				this.triggerDraft.set(
					list.map((item) => ({ ...item, aliases: [...(item.aliases ?? [])] })),
				);
			}
		});
	}

	updateTrigger(index: number, field: 'command' | 'aliases', event: Event): void {
		const value = this.value(event);

		this.triggerDraft.update((list) =>
			list.map((item, itemIndex) => {
				if (itemIndex !== index) {
					return item;
				}

				if (field === 'aliases') {
					return {
						...item,
						aliases: value
							.split(',')
							.map((alias) => alias.trim())
							.filter(Boolean),
					};
				}

				return { ...item, command: value };
			}),
		);
	}

	addTrigger(): void {
		const next = TRIGGER_ACTIONS.find((item) => item.action === this.triggerAction()) ?? TRIGGER_ACTIONS[0];

		this.triggerDraft.update((list) => [
			...list,
			{ action: next.action, command: '', aliases: [], enabled: true, description: next.description },
		]);
	}

	removeTrigger(index: number): void {
		this.triggerDraft.update((list) => list.filter((_, itemIndex) => itemIndex !== index));
	}

	toggleTrigger(index: number): void {
		const enabled = !(this.triggerDraft()[index]?.enabled ?? false);

		this.triggerDraft.update((list) =>
			list.map((item, itemIndex) => (itemIndex === index ? { ...item, enabled } : item)),
		);
	}

	openTriggers(): void {
		this.tab.set('triggers');
	}

	saveTriggers(): void {
		this.triggersService.save(this.triggerDraft()).subscribe({
			next: (response) => {
				this.triggerDraft.set(
					response.triggers.map((item) => ({ ...item, aliases: [...(item.aliases ?? [])] })),
				);
				this.triggersSaved.set(true);

				timer(1500)
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe(() => this.triggersSaved.set(false));
			},
			error: (response) => this.error.set(response.error?.error ?? 'Не удалось сохранить триггеры'),
		});
	}

	editVariable(variable: CommandVariable): void {
		this.variableEditingId.set(variable.id);
		this.variableName.set(variable.name);
		this.variableValue.set(variable.value);
		this.variableAction.set(variable.action);
	}

	resetVariableForm(): void {
		this.variableEditingId.set(null);
		this.variableName.set('');
		this.variableValue.set('');
		this.variableAction.set('');
	}

	saveVariable(): void {
		this.service.saveVariable({
			id: this.variableEditingId() ?? undefined,
			name: this.variableName(),
			value: this.variableValue(),
			action: this.variableAction(),
		}).subscribe({
			next: () => {
				this.resetVariableForm();
				this.refresh.update((value) => value + 1);
			},
			error: (response) => this.error.set(response.error?.error ?? 'Не удалось сохранить переменную'),
		});
	}

	removeVariable(id: string): void {
		this.service.removeVariable(id).subscribe(() => this.refresh.update((value) => value + 1));
	}

	insertVariable(variable: string): void {
		this.response.update((value) => `${value}${value ? ' ' : ''}${variable}`);
	}

	setTriggerActionLabel(label: string): void {
		const index = this.triggerActionLabels.indexOf(label);

		if (index >= 0) {
			this.triggerActionControl.setValue(this.triggerActionValues[index]);
			this.triggerAction.set(this.triggerActionValues[index]);
		}
	}

	setRewardActionLabel(label: string): void {
		const index = this.rewardActionLabels.indexOf(label);

		if (index >= 0) {
			this.rewardAction.set(this.rewardActionValues[index]);
		}
	}

	setRewardCommandLabel(label: string): void {
		const command = this.commands().commands.find((item) => `!${item.name}` === label);

		if (command) {
			this.rewardPayload.set(command.id);
		}
	}

	setVariableActionLabel(label: string): void {
		const index = this.variableActionLabels.indexOf(label);
		if (index >= 0) {
			this.variableActionControl.setValue(this.variableActionValues[index]);
			this.variableAction.set(this.variableActionValues[index]);
		}
	}

	setActionLabel(label: string): void {
		const index = this.actionLabels.indexOf(label);

		if (index >= 0) {
			this.actionControl.setValue(this.actionValues[index]);
			this.action.set(this.actionValues[index]);
		}
	}

	check(event: Event): boolean {
		return (event.target as HTMLInputElement).checked;
	}

	value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}

	resetForm(): void {
		this.editingId.set(null);
		this.name.set('');
		this.response.set('');
		this.reply.set('');
		this.action.set('say');
		this.aliases.set('');
		this.cooldown.set(5);
		this.level.set('everyone');
		this.action.set('say');
		this.actionControl.setValue('say', { emitEvent: false });
		this.testResult.set(null);
		this.error.set(null);
	}

	edit(command: ChatCommand): void {
		this.editingId.set(command.id);
		this.name.set(command.name);
		this.response.set(command.response);
		this.reply.set(command.reply ?? '');
		this.aliases.set(command.aliases.join(', '));
		this.cooldown.set(command.cooldownSeconds);
		this.level.set(command.userLevel);
		this.action.set(command.action || 'say');
		this.actionControl.setValue(this.action(), { emitEvent: false });
		this.error.set(null);
	}

	saveCommand(): void {
		this.error.set(null);

		const payload: Partial<ChatCommand> = {
			id: this.editingId() ?? undefined,
			name: this.name().trim(),
			action: this.action(),
			response: this.response().trim(),
			reply: this.reply().trim(),
			aliases: this.aliases()
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean),
			cooldownSeconds: this.cooldown(),
			userLevel: this.level(),
			enabled: true,
		};

		this.service.save(payload).subscribe({
			next: () => {
				this.resetForm();
				this.refresh.update((v) => v + 1);
			},
			error: (response) => {
				this.error.set(response.error?.error ?? 'Не удалось сохранить команду');
			},
		});
	}

	commandEnabled(command: ChatCommand): boolean {
		return this.commandOverrides()[command.id] ?? command.enabled;
	}

	timerEnabled(timer: MessageTimer): boolean {
		return this.timerOverrides()[timer.id] ?? timer.enabled;
	}

	toggleCommand(command: ChatCommand): void {
		const enabled = !this.commandEnabled(command);

		this.commandOverrides.update((value) => ({ ...value, [command.id]: enabled }));
		this.service.setEnabled(command.id, enabled).subscribe({
			next: () => this.refresh.update((v) => v + 1),
			error: (response) => {
				this.commandOverrides.update((value) => ({ ...value, [command.id]: !enabled }));
				this.error.set(response.error?.error ?? 'Не удалось переключить команду');
			},
		});
	}

	removeCommand(id: string): void {
		this.service.remove(id).subscribe(() => this.refresh.update((v) => v + 1));
	}

	testCommand(id: string): void {
		this.service.test(id).subscribe(({ response }) => this.testResult.set(response));
	}

	/* Таймеры */

	resetTimerForm(): void {
		this.timerEditingId.set(null);
		this.timerName.set('');
		this.timerText.set('');
		this.timerInterval.set(10);
		this.timerActiveOnly.set(true);
		this.timerRandom.set(false);
	}

	editTimer(timer: MessageTimer): void {
		this.timerEditingId.set(timer.id);
		this.timerName.set(timer.name);
		this.timerText.set(timer.messages.join('\n'));
		this.timerInterval.set(Math.max(1, Math.round(timer.intervalSeconds / 60)));
		this.timerActiveOnly.set(timer.activeOnly);
		this.timerRandom.set(timer.random);
	}

	saveTimer(): void {
		const messages = this.timerText()
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);

		this.service
			.saveTimer({
				id: this.timerEditingId() ?? undefined,
				name: this.timerName().trim() || 'Таймер',
				messages,
				intervalSeconds: this.timerInterval() * 60,
				enabled: true,
				activeOnly: this.timerActiveOnly(),
				random: this.timerRandom(),
			})
			.subscribe({
				next: () => {
					this.resetTimerForm();
					this.refresh.update((v) => v + 1);
				},
				error: (response) => {
					this.error.set(response.error?.error ?? 'Не удалось сохранить таймер');
				},
			});
	}

	toggleTimer(item: MessageTimer): void {
		const enabled = !this.timerEnabled(item);

		this.timerOverrides.update((value) => ({ ...value, [item.id]: enabled }));
		this.service
			.saveTimer({ ...item, enabled })
			.subscribe(() => this.refresh.update((v) => v + 1));
	}

	removeTimer(id: string): void {
		this.service.removeTimer(id).subscribe(() => this.refresh.update((v) => v + 1));
	}

	formatInterval(seconds: number): string {
		const minutes = Math.round(seconds / 60);

		return `${minutes} мин`;
	}

	levelLabel(level: string): string {
		const labels: Record<string, string> = {
			everyone: 'Все',
			subscriber: 'Сабы',
			vip: 'VIP',
			moderator: 'Модеры',
			broadcaster: 'Стример',
		};

		return labels[level] ?? level;
	}
}
