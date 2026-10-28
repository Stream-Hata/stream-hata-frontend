import type {
	GamesSettings,
	PointsReward,
	PointsState,
	Quote,
	RedemptionsState,
} from '@shared/types/automation';
import { Component, computed, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
	GamesService,
	PointsService,
	QuotesService,
	RedemptionsService,
} from '@shared/services/engagement.services';
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

const MAPPING_ACTION_LABELS: Record<string, string> = {
	say: 'Сообщение в чат',
	spin: 'Обычное',
	elimination: 'На выбывание',
	points: 'Начислить баллы',
	timeout: 'Таймаут',
	wheel: 'Колесо',
};

const EMPTY_POINTS: PointsState = {
	top: [],
	settings: {
		enabled: true,
		pointsPerMessage: 1,
		messageCooldownSeconds: 60,
		pointsPerMinute: 1,
		streakBonusPerLevel: 5,
		subscribeBonus: 500,
		giftBonus: 250,
		cheerBonusPerBit: 1,
	},
	rewards: [],
	transactions: [],
};

const EMPTY_REDEMPTIONS: RedemptionsState = { mappings: [], recent: [] };

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
	day: 'numeric',
	month: 'short',
	hour: '2-digit',
	minute: '2-digit',
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
	selector: 'app-points-page',
	providers: [
		tuiItemsHandlersProvider({
			stringify: signal((value: string) => MAPPING_ACTION_LABELS[value] ?? value),
		}),
	],
	styleUrl: './points-page.scss',
	templateUrl: './points-page.html',
})
export default class PointsPage {
	private readonly pointsService = inject(PointsService);
	private readonly gamesService = inject(GamesService);
	private readonly quotesService = inject(QuotesService);
	private readonly redemptionsService = inject(RedemptionsService);
	private readonly destroyRef = inject(DestroyRef);

	readonly tab = signal<'board' | 'shop' | 'games' | 'quotes' | 'redemptions'>('board');
	readonly refresh = signal(0);

	readonly state = toSignal(
		merge(timer(0, 15000), toObservable(this.refresh)).pipe(
			switchMap(() => this.pointsService.getState().pipe(catchError(() => of(EMPTY_POINTS)))),
		),
		{ initialValue: EMPTY_POINTS },
	);

	readonly games = toSignal(
		merge(timer(0, 30000), toObservable(this.refresh)).pipe(
			switchMap(() => this.gamesService.getSettings().pipe(catchError(() => of(null)))),
		),
		{ initialValue: null },
	);

	readonly quotes = toSignal(
		merge(timer(0, 30000), toObservable(this.refresh)).pipe(
			switchMap(() =>
				this.quotesService.list().pipe(catchError(() => of({ quotes: [] as Quote[] }))),
			),
		),
		{ initialValue: { quotes: [] as Quote[] } },
	);

	readonly redemptions = toSignal(
		merge(timer(0, 15000), toObservable(this.refresh)).pipe(
			switchMap(() =>
				this.redemptionsService.getState().pipe(catchError(() => of(EMPTY_REDEMPTIONS))),
			),
		),
		{ initialValue: EMPTY_REDEMPTIONS },
	);

	readonly search = signal('');
	readonly settingsOpen = signal(false);
	readonly filteredTop = computed(() => {
		const query = this.search().trim().toLowerCase();

		if (!query) {
			return this.state().top;
		}

		return this.state().top.filter(
			(wallet) =>
				wallet.displayName.toLowerCase().includes(query) ||
				wallet.login.toLowerCase().includes(query),
		);
	});

	/* Формы */
	readonly rewardName = signal('');
	readonly rewardCost = signal(100);
	readonly rewardResponse = signal('');
	readonly editingReward = signal<PointsReward | null>(null);

	readonly quoteText = signal('');
	readonly quoteAuthor = signal('');

	readonly mappingTitle = signal('');
	setWheelModeLabel(label: string): void {
		const index = this.wheelModeLabels.indexOf(label);

		if (index < 0) {
			return;
		}

		const value = this.wheelModeValues[index];
		this.wheelModeControl.setValue(value);
		this.wheelMode.set(value);
	}

	setMappingActionLabel(label: string): void {
		const index = this.mappingActionLabels.indexOf(label);

		if (index < 0) {
			return;
		}

		const value = this.mappingActionValues[index];
		this.mappingActionControl.setValue(value);
		this.mappingAction.set(value);
	}

	readonly mappingAction = signal('say');
	readonly mappingActionControl = new FormControl('say', { nonNullable: true });
	readonly mappingActionValues = ['say', 'points', 'timeout', 'wheel'];
	readonly mappingActionLabels = ['Сообщение в чат', 'Начислить баллы', 'Таймаут', 'Колесо'];
	readonly mappingPayload = signal('');

	readonly gameMinBet = signal(10);
	readonly wheelMode = signal<'spin' | 'elimination'>('spin');
	readonly wheelModeControl = new FormControl<'spin' | 'elimination'>('spin', { nonNullable: true });
	readonly wheelModeValues: Array<'spin' | 'elimination'> = ['spin', 'elimination'];
	readonly wheelModeLabels = ['Обычное', 'На выбывание'];
	readonly wheelRoundSeconds = signal(60);
	readonly wheelTitle = signal('');
	readonly wheelBet = signal(100);
	private gamesLoaded = false;

	private readonly syncGames = effect(() => {
		const games = this.games();

		if (!games || this.gamesLoaded) {
			return;
		}

		this.gamesLoaded = true;
		this.wheelModeControl.setValue(games.wheelMode ?? 'spin');
		this.wheelRoundSeconds.set(games.wheelRoundSeconds ?? 60);
	});

	readonly gameMaxBet = signal(1000);
	readonly triviaPoints = signal(100);
	readonly triviaQuestions = signal('');
	readonly saved = signal(false);

	check(event: Event): boolean {
		return (event.target as HTMLInputElement).checked;
	}

	value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}

	number(event: Event): number {
		return +(event.target as HTMLInputElement).value;
	}

	togglePoints(event: Event): void {
		const settings = { ...this.state().settings, enabled: this.check(event) };
		this.pointsService.saveSettings(settings).subscribe(() => this.refresh.update((v) => v + 1));
	}

	saveRates(): void {
		const settings = {
			...this.state().settings,
			pointsPerMessage: this.rateValue('pointsPerMessage'),
			messageCooldownSeconds: this.rateValue('messageCooldownSeconds'),
			pointsPerMinute: this.rateValue('pointsPerMinute'),
			streakBonusPerLevel: this.rateValue('streakBonusPerLevel'),
			subscribeBonus: this.rateValue('subscribeBonus'),
			cheerBonusPerBit: this.rateValue('cheerBonusPerBit'),
			giftBonus: this.rateValue('giftBonus'),
		};

		this.pointsService.saveSettings(settings).subscribe(() => this.flashSaved());
	}

	private readonly rateDraft = signal<Record<string, number>>({});

	rateValue(field: string): number {
		const draft = this.rateDraft();

		if (field in draft) {
			return draft[field] ?? 0;
		}

		return Number((this.state().settings as unknown as Record<string, number>)[field] ?? 0);
	}

	setRate(field: string, event: Event): void {
		this.rateDraft.update((draft) => ({ ...draft, [field]: this.number(event) }));
	}

	saveReward(): void {
		this.pointsService
			.saveReward({
				id: this.editingReward()?.id,
				name: this.rewardName().trim(),
				cost: this.rewardCost(),
				response: this.rewardResponse().trim(),
				enabled: true,
			})
			.subscribe(() => {
				this.editingReward.set(null);
				this.rewardName.set('');
				this.rewardCost.set(100);
				this.rewardResponse.set('');
				this.refresh.update((v) => v + 1);
			});
	}

	editReward(reward: PointsReward): void {
		this.editingReward.set(reward);
		this.rewardName.set(reward.name);
		this.rewardCost.set(reward.cost);
		this.rewardResponse.set(reward.response);
	}

	removeReward(id: string): void {
		this.pointsService.removeReward(id).subscribe(() => this.refresh.update((v) => v + 1));
	}

	questionsDraft(): string {
		const draft = this.triviaQuestions();

		if (draft) {
			return draft;
		}

		return (this.games()?.triviaQuestions ?? [])
			.map((question) => `${question.text} | ${question.answer}`)
			.join('\n');
	}

	saveGames(): void {
		const current = this.games();

		if (!current) {
			return;
		}

		const questions = this.triviaQuestions()
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean)
			.map((line) => {
				const [text, answer] = line.split('|');

				return { text: (text ?? '').trim(), answer: (answer ?? '').trim() };
			})
			.filter((question) => question.text && question.answer);

		const settings: GamesSettings = {
			...current,
			minBet: this.gameMinBet(),
			maxBet: this.gameMaxBet(),
			triviaPoints: this.triviaPoints(),
			triviaQuestions: questions.length ? questions : current.triviaQuestions,
			wheelMode: this.wheelMode(),
			wheelRoundSeconds: this.wheelRoundSeconds(),
		};

		this.gamesService.saveSettings(settings).subscribe(() => this.flashSaved());
	}

	toggleGame(field: 'slotsEnabled' | 'wheelEnabled' | 'triviaEnabled', event: Event): void {
		const current = this.games();

		if (!current) {
			return;
		}

		this.gamesService
			.saveSettings({ ...current, [field]: this.check(event) })
			.subscribe(() => this.refresh.update((v) => v + 1));
	}

	startWheel(): void {
		this.gamesService
			.startWheel(this.wheelTitle().trim() || 'Колесо', this.wheelBet(), this.wheelRoundSeconds())
			.subscribe(() => this.refresh.update((value) => value + 1));
	}

	spinWheel(): void {
		this.gamesService.spinWheel().subscribe(() => this.refresh.update((value) => value + 1));
	}

	addQuote(): void {
		this.quotesService
			.add(this.quoteText().trim(), this.quoteAuthor().trim() || 'аноним')
			.subscribe(() => {
				this.quoteText.set('');
				this.quoteAuthor.set('');
				this.refresh.update((v) => v + 1);
			});
	}

	removeQuote(id: string): void {
		this.quotesService.remove(id).subscribe(() => this.refresh.update((v) => v + 1));
	}

	voteQuote(id: string): void {
		let userId = localStorage.getItem('nsh.quote.voter');

		if (!userId) {
			userId = `viewer-${crypto.randomUUID()}`;
			localStorage.setItem('nsh.quote.voter', userId);
		}

		this.quotesService.vote(id, userId).subscribe({
			next: () => this.refresh.update((v) => v + 1),
			error: () => undefined,
		});
	}

	saveMapping(): void {
		this.redemptionsService
			.saveMapping({
				rewardTitle: this.mappingTitle().trim(),
				action: this.mappingAction(),
				payload: this.mappingPayload().trim(),
				enabled: true,
			})
			.subscribe(() => {
				this.mappingTitle.set('');
				this.mappingPayload.set('');
				this.refresh.update((v) => v + 1);
			});
	}

	removeMapping(id: string): void {
		this.redemptionsService.removeMapping(id).subscribe(() => this.refresh.update((v) => v + 1));
	}

	formatTime(value: string): string {
		const date = new Date(value);

		return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU', DATE_FORMAT);
	}

	actionLabel(action: string): string {
		const labels: Record<string, string> = {
			say: 'Сообщение в чат',
			spin: 'Обычное',
			elimination: 'На выбывание',
			points: 'Начислить баллы',
			timeout: 'Таймаут',
		};

		return labels[action] ?? action;
	}

	private flashSaved(): void {
		this.saved.set(true);

		timer(1500)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.saved.set(false));
	}
}
