import type { ChatCommand, MessageTimer, Trigger, TwitchReward, TwitchRewardsState } from '@shared/types/automation';
import { Component, computed, DestroyRef, effect, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { CommandsService } from '@shared/services/commands.service';
import { I18nService } from '@shared/services/i18n.service';
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
	{ action: 'points.balance', description: 'Баланс баллов' },
	{ action: 'points.top', description: 'Топ зрителей' },
	{ action: 'points.shop', description: 'Магазин наград' },
	{ action: 'points.redeem', description: 'Купить награду' },
	{ action: 'games.slots', description: 'Слоты' },
	{ action: 'games.wheel', description: 'Колесо' },
	{ action: 'games.trivia', description: 'Викторина' },
	{ action: 'games.duel', description: 'Дуэль: вызов' },
	{ action: 'games.accept', description: 'Дуэль: принять' },
	{ action: 'quotes.quote', description: 'Цитаты' },
	{ action: 'jury.yea', description: 'Голос жюри: за' },
	{ action: 'jury.nei', description: 'Голос жюри: против' },
	{ action: 'clips.clip', description: 'Создать клип' },
	{ action: 'music.add', description: 'Добавить музыку' },
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
	private readonly triggersService = inject(TriggersService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly injector = inject(Injector);

	readonly tab = signal<'commands' | 'timers' | 'triggers' | 'rewards'>('commands');
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
	readonly aliases = signal('');
	readonly cooldown = signal(5);
	readonly action = signal('say');
	readonly actionControl = signalControl(this.action, this.injector);
	readonly variables = ['$(user)', '$(login)', '$(channel)', '$(count)', '$(date)', '$(time)', '$(now)', '$(lastmusic)', '$(lasttrack)', '$(np)'];
	readonly actionValues = ['say', 'points', 'timeout', 'wheel', 'music', 'clip', 'lastmusic'];
	readonly actionLabels = ['Сообщение в чат', 'Начислить баллы', 'Таймаут', 'Колесо', 'Добавить музыку', 'Создать клип', 'Ссылка на текущую музыку'];
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
