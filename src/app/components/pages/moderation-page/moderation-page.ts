import type { WordListPreset } from '@shared/services/moderation.service';
import type { ModerationFilters, ModerationLogEntry } from '@shared/types/automation';
import { Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { signalControl } from '@shared/helpers/form-control';
import { ModerationService } from '@shared/services/moderation.service';
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
	TuiInputNumber,
	TuiBadge,
	TuiChevron,
	TuiDataListWrapper,
	TuiInputFiles,
	TuiInputFilesDirective,
	TuiSegmented,
	TuiSwitch,
	TuiTextarea,
} from '@taiga-ui/kit';
import { catchError, map, of, switchMap, timer } from 'rxjs';

const PRESET_LABELS: Record<string, string> = {
	'': 'Открытые списки…',
	'basic-ru': 'Базовый RU',
	'spam-scam': 'Спам и скам',
	'twitch-basic': 'Twitch: базовые правила',
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
		TuiInputFiles,
		TuiInputFilesDirective,
		TuiSegmented,
		TuiSwitch,
		TuiTable,
		TuiTableTbody,
		TuiTableTd,
		TuiTableTh,
		TuiTableThead,
		TuiTextarea,
		TuiTextfield,
	],
	selector: 'app-moderation-page',
	providers: [
		tuiItemsHandlersProvider({
			stringify: signal((value: string) => PRESET_LABELS[value] ?? value),
		}),
	],
	styleUrl: './moderation-page.scss',
	templateUrl: './moderation-page.html',
})
export default class ModerationPage {
	private readonly service = inject(ModerationService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly injector = inject(Injector);

	readonly log = toSignal(
		timer(0, 5000).pipe(
			switchMap(() =>
				this.service.getState().pipe(
					map((state) => state.log),
					catchError(() => of([] as ModerationLogEntry[])),
				),
			),
		),
		{ initialValue: [] as ModerationLogEntry[] },
	);

	readonly dryRun = signal(false);
	readonly dryRunControl = signalControl(this.dryRun, this.injector);
	readonly action = signal('delete');
	readonly actionIndex = computed(() => (this.action() === 'delete' ? 0 : 1));
	readonly timeoutSeconds = signal(600);
	readonly bannedWords = signal('');
	readonly blockLinks = signal(false);
	readonly blockLinksControl = signalControl(this.blockLinks, this.injector);
	readonly capsEnabled = signal(false);
	readonly capsEnabledControl = signalControl(this.capsEnabled, this.injector);
	readonly capsPercent = signal(70);
	readonly capsMinLength = signal(15);
	readonly emojiEnabled = signal(false);
	readonly emojiEnabledControl = signalControl(this.emojiEnabled, this.injector);
	readonly emojiMax = signal(8);
	readonly repeatEnabled = signal(false);
	readonly repeatEnabledControl = signalControl(this.repeatEnabled, this.injector);
	readonly repeatMax = signal(3);
	readonly repeatWindow = signal(30);
	readonly exemptModerators = signal(true);
	readonly exemptModeratorsControl = signalControl(this.exemptModerators, this.injector);
	readonly aiEnabled = signal(false);
	readonly aiThreshold = signal(0.7);
	readonly saved = signal(false);
	readonly error = signal<string | null>(null);

	/* Редактор запреток */
	readonly presets = toSignal(
		this.service.wordlists().pipe(
			map((response) => response.presets),
			catchError(() => of([] as WordListPreset[])),
		),
		{ initialValue: [] as WordListPreset[] },
	);

	readonly presetId = signal('');
	readonly presetIdControl = signalControl(this.presetId, this.injector);
	readonly presetValues = computed(() => ['', ...this.presets().map((preset) => preset.id)]);
	readonly presetLabels = computed(() => [
		'Открытые списки…',
		...this.presets().map((preset) => preset.name),
	]);

	readonly listUrl = signal('');
	readonly wordCount = computed(() => this.parseWords(this.bannedWords()).length);

	readonly editorPlugins = [
		{
			icon: '@tui.copy',
			id: 'dedupe',
			label: 'Дубликаты',
			run: (text: string) => this.mergeWords(this.parseWords(text)),
		},
		{
			icon: '@tui.arrow-down-up',
			id: 'sort',
			label: 'Сортировать',
			run: (text: string) =>
				this.parseWords(text)
					.sort((a, b) => a.localeCompare(b))
					.join('\n'),
		},
		{
			icon: '@tui.case-lower',
			id: 'lower',
			label: 'Нижний регистр',
			run: (text: string) => text.toLowerCase(),
		},
		{
			icon: '@tui.message-square-off',
			id: 'comments',
			label: 'Без комментариев',
			run: (text: string) =>
				text
					.split('\n')
					.filter((line) => !line.trim().startsWith('#'))
					.join('\n'),
		},
		{
			icon: '@tui.eraser',
			id: 'trim',
			label: 'Обрезать пробелы',
			run: (text: string) =>
				text
					.split('\n')
					.map((line) => line.trim())
					.filter(Boolean)
					.join('\n'),
		},
	];

	applyPlugin(plugin: { run: (text: string) => string }): void {
		this.bannedWords.set(plugin.run(this.bannedWords()));
	}

	importFromInput(event: Event): void {
		this.readFiles((event.target as HTMLInputElement).files);
	}

	importFromDrop(event: DragEvent): void {
		this.readFiles(event.dataTransfer?.files ?? null);
	}

	readFiles(files: FileList | null): void {
		const file = files?.[0];

		if (!file) {
			return;
		}

		void file.text().then((text) => {
			this.bannedWords.set(
				this.mergeWords([...this.parseWords(this.bannedWords()), ...this.parseWords(text)]),
			);
		});
	}

	addPreset(): void {
		const preset = this.presets().find((item) => item.id === this.presetId());

		if (preset) {
			this.bannedWords.set(
				this.mergeWords([...this.parseWords(this.bannedWords()), ...preset.words]),
			);
		}
	}

	importFromUrl(): void {
		const url = this.listUrl().trim();

		if (!url) {
			return;
		}

		this.service.fetchWordlist(url).subscribe({
			next: (response) => {
				this.bannedWords.set(
					this.mergeWords([...this.parseWords(this.bannedWords()), ...response.words]),
				);
				this.listUrl.set('');
			},
			error: (response) => this.error.set(response.error?.error ?? 'Не удалось загрузить список'),
		});
	}

	parseWords(text: string): string[] {
		const seen = new Set<string>();
		const words: string[] = [];

		for (const part of text.split(/[\n,;]+/)) {
			const word = part.trim();

			if (!word || word.startsWith('#')) {
				continue;
			}

			const key = word.toLowerCase();

			if (seen.has(key)) {
				continue;
			}

			seen.add(key);
			words.push(word);
		}

		return words;
	}

	mergeWords(words: string[]): string {
		return this.parseWords(words.join('\n')).join('\n');
	}

	private loaded = false;

	constructor() {
		this.service
			.getState()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (state) => this.applyFilters(state.filters),
				error: () => undefined,
			});
	}

	setAction(index: number): void {
		this.action.set(index === 0 ? 'delete' : 'timeout');
	}

	value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}

	save(): void {
		this.service
			.saveFilters({
				dryRun: this.dryRun(),
				action: this.action(),
				timeoutSeconds: this.timeoutSeconds(),
				bannedWords: this.bannedWords()
					.split(/[,\n]/)
					.map((item) => item.trim())
					.filter(Boolean),
				blockLinks: this.blockLinks(),
				capsEnabled: this.capsEnabled(),
				capsPercent: this.capsPercent(),
				capsMinLength: this.capsMinLength(),
				emojiEnabled: this.emojiEnabled(),
				emojiMax: this.emojiMax(),
				repeatEnabled: this.repeatEnabled(),
				repeatMax: this.repeatMax(),
				repeatWindowSeconds: this.repeatWindow(),
				exemptModerators: this.exemptModerators(),
				aiEnabled: this.aiEnabled(),
				aiThreshold: this.aiThreshold(),
				aiWindowChecks: 30,
			})
			.subscribe({
				next: () => {
					this.saved.set(true);

					timer(1500)
						.pipe(takeUntilDestroyed(this.destroyRef))
						.subscribe(() => this.saved.set(false));
				},
			});
	}

	formatTime(value: string): string {
		const date = new Date(value);

		return Number.isNaN(date.getTime())
			? '—'
			: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	}

	private applyFilters(filters: ModerationFilters): void {
		if (this.loaded) {
			return;
		}

		this.loaded = true;

		this.dryRun.set(filters.dryRun);
		this.action.set(filters.action);
		this.timeoutSeconds.set(filters.timeoutSeconds);
		this.bannedWords.set(filters.bannedWords.join(', '));
		this.blockLinks.set(filters.blockLinks);
		this.capsEnabled.set(filters.capsEnabled);
		this.capsPercent.set(filters.capsPercent);
		this.capsMinLength.set(filters.capsMinLength);
		this.emojiEnabled.set(filters.emojiEnabled);
		this.emojiMax.set(filters.emojiMax);
		this.repeatEnabled.set(filters.repeatEnabled);
		this.repeatMax.set(filters.repeatMax);
		this.repeatWindow.set(filters.repeatWindowSeconds);
		this.exemptModerators.set(filters.exemptModerators);
		this.aiEnabled.set(filters.aiEnabled);
		this.aiThreshold.set(filters.aiThreshold);
	}
}
