import type { ChatCommand, MessageTimer, Trigger } from '@shared/types/automation';
import { Component, computed, DestroyRef, effect, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { CommandsService } from '@shared/services/commands.service';
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
];

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
	private readonly triggersService = inject(TriggersService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly injector = inject(Injector);

	readonly tab = signal<'commands' | 'timers' | 'triggers'>('commands');
	readonly refresh = signal(0);

	readonly commands = toSignal(
		merge(timer(0, 10000), toObservable(this.refresh)).pipe(
			switchMap(() => this.service.list().pipe(catchError(() => of({ commands: [] })))),
		),
		{ initialValue: { commands: [] as ChatCommand[] } },
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
	readonly level = signal('everyone');
	readonly levelControl = signalControl(this.level, this.injector);
	readonly levelValues = ['everyone', 'subscriber', 'vip', 'moderator', 'broadcaster'];
	readonly levelLabels = ['Все', 'Сабы', 'VIP', 'Модеры', 'Стример'];
	readonly testResult = signal<string | null>(null);
	readonly error = signal<string | null>(null);
	readonly commandOverrides = signal<Record<string, boolean>>({});
	readonly timerOverrides = signal<Record<string, boolean>>({});

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

	/* Триггеры */
	readonly triggers = toSignal(
		this.triggersService.list().pipe(catchError(() => of({ triggers: [] as Trigger[] }))),
		{ initialValue: { triggers: [] as Trigger[] } },
	);

	readonly triggerDraft = signal<Trigger[]>([]);
	readonly triggerActions = TRIGGER_ACTIONS;
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
		const used = new Set(this.triggerDraft().map((item) => item.action));
		const next = TRIGGER_ACTIONS.find((item) => !used.has(item.action));

		if (!next) {
			this.error.set('Все доступные триггеры уже добавлены');

			return;
		}

		this.triggerDraft.update((list) => [
			...list,
			{ action: next.action, command: '', aliases: [], enabled: true, description: next.description },
		]);
	}

	removeTrigger(index: number): void {
		this.triggerDraft.update((list) => list.filter((_, itemIndex) => itemIndex !== index));
	}

	toggleTrigger(index: number, event: Event): void {
		const enabled = this.check(event);

		this.triggerDraft.update((list) =>
			list.map((item, itemIndex) => (itemIndex === index ? { ...item, enabled } : item)),
		);
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
		this.aliases.set('');
		this.cooldown.set(5);
		this.level.set('everyone');
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
		this.error.set(null);
	}

	saveCommand(): void {
		this.error.set(null);

		const payload: Partial<ChatCommand> = {
			id: this.editingId() ?? undefined,
			name: this.name().trim(),
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

	toggleCommand(command: ChatCommand, event: Event): void {
		const enabled = this.check(event);

		this.commandOverrides.update((value) => ({ ...value, [command.id]: enabled }));
		this.service.save({ ...command, enabled }).subscribe({
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

	toggleTimer(item: MessageTimer, event: Event): void {
		const enabled = this.check(event);

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
