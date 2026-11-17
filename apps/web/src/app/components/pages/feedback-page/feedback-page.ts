import type { FeedbackReport, FeedbackReportSummary } from '@shared/services/feedback.service';
import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FEEDBACK_REASONS } from '@shared/config/feedback-reasons';
import { FeedbackService } from '@shared/services/feedback.service';
import { TwitchService } from '@shared/services/twitch.service';
import { TuiButton, TuiCheckbox, TuiDropdown, TuiInput, TuiSelectLike, TuiTextfield } from '@taiga-ui/core';
import { provideTuiEditor, TuiEditor } from '@taiga-ui/editor';
import { TuiChevron, TuiDataListWrapper, TuiSwitch, TuiTextarea } from '@taiga-ui/kit';

@Component({
	imports: [
		DatePipe,
		ReactiveFormsModule,
		TuiButton,
		TuiCheckbox,
		TuiChevron,
		TuiDataListWrapper,
		TuiDropdown,
		TuiEditor,
		TuiInput,
		TuiSelectLike,
		TuiSwitch,
		TuiTextarea,
		TuiTextfield,
	],
	selector: 'app-feedback-page',
	providers: [provideTuiEditor()],
	styleUrl: './feedback-page.scss',
	templateUrl: './feedback-page.html',
})
export default class FeedbackPage {
	private readonly feedback = inject(FeedbackService);
	private readonly twitch = inject(TwitchService);
	private readonly destroyRef = inject(DestroyRef);

	readonly area = signal<FeedbackReport['area']>('frontend');
	readonly areaLabel = computed(() => this.areaLabels[this.areaValues.indexOf(this.area())] ?? 'Frontend');
	readonly kind = signal<FeedbackReport['kind']>('bug');
	readonly kindLabel = computed(() => this.kindLabels[this.kindValues.indexOf(this.kind())] ?? 'Баг');
	readonly prefixPreview = computed(() =>
		this.kind() === 'feedback'
			? 'FB'
			: this.area() === 'backend'
				? 'BE'
				: this.area() === 'frontend'
					? 'FE'
					: 'DT',
	);

	readonly platform = signal('');
	readonly platformOptions = ['Linux', 'Windows', 'macOS', 'Android', 'iOS', 'Другое'];
	readonly platformLabel = computed(() => this.platform() || 'Не выбрано');
	readonly attachments = signal<{ label: string; url: string; enabled: boolean }[]>([]);
	readonly reason = signal('');
	readonly reasons = signal<string[]>([]);
	readonly reasonQuery = signal('');
	readonly customReason = signal('');
	readonly customReasonVisible = signal(false);
	readonly areaValues = ['frontend', 'backend', 'desktop'];
	readonly areaLabels = ['Frontend', 'Backend', 'Desktop'];
	readonly kindValues = ['bug', 'suggestion', 'feedback'];
	readonly kindLabels = ['Баг', 'Предложение', 'Фидбек'];
	readonly filteredGroups = computed(() => {
		const query = this.reasonQuery().trim().toLowerCase();
		const groups = new Map<string, string[]>();

		for (const item of FEEDBACK_REASONS) {
			if (query && !`${item.label} ${item.group} ${item.area}`.toLowerCase().includes(query)) {
				continue;
			}
			const key = `${this.areaLabels[this.areaValues.indexOf(item.area)]} · ${item.group}`;
			const values = groups.get(key) ?? [];
			values.push(item.label);
			groups.set(key, values);
		}

		if (!query || 'своя причина'.includes(query)) {
			groups.set('Другое', ['Своя причина']);
		}

		return {
			labels: [...groups.keys()],
			items: [...groups.values()],
		};
	});

	readonly title = signal('');
	readonly description = signal('');
	readonly descriptionControl = new FormControl('', { nonNullable: true });
	readonly steps = signal('');
	readonly expected = signal('');
	readonly actual = signal('');
	readonly version = signal('');
	readonly versionOptions = [
		'1.0.0-pre-alpha',
		'0.9.9-pre-alpha',
		'0.9.8-pre-alpha',
		'0.9.7-pre-alpha',
		'0.9.6-pre-alpha',
		'0.9.5-pre-alpha',
		'0.9.4-pre-alpha',
		'0.9.3-pre-alpha',
		'0.9.2-pre-alpha',
		'0.9.1-pre-alpha',
		'0.9.0-pre-alpha',
		'0.8.11-pre-alpha',
		'0.8.9-pre-alpha',
		'0.8.8-pre-alpha',
		'0.8.7-pre-alpha',
		'0.8.6-pre-alpha',
		'0.8.5-pre-alpha',
		'Не знаю',
	];

	readonly versionLabel = computed(() => this.version() || 'Не выбрано');
	readonly severity = signal('medium');
	readonly severityValues = ['low', 'medium', 'high', 'critical'];
	readonly severityLabels = ['Низкая', 'Средняя', 'Высокая', 'Критичная'];
	readonly severityLabel = computed(
		() => this.severityLabels[this.severityValues.indexOf(this.severity())] ?? 'Средняя',
	);

	readonly pageUrl = signal('');
	readonly environment = signal('');
	readonly contact = signal('');
	readonly website = signal('');
	readonly author = signal('');
	readonly authenticated = signal(false);
	readonly authLoading = signal(true);
	readonly mineVisible = signal(false);
	readonly mineLoading = signal(false);
	readonly mineItems = signal<FeedbackReportSummary[]>([]);
	readonly similarQuery = signal('');
	readonly similarLoading = signal(false);
	readonly similarItems = signal<FeedbackReportSummary[]>([]);
	readonly telegramMessage = signal('');
	readonly diagnosticsEnabled = signal(true);
	readonly logPeriod = signal('1h');
	readonly logPeriodValues = ['15m', '1h', '6h', '24h'];
	readonly logPeriodLabels = ['15 минут', '1 час', '6 часов', '24 часа'];
	readonly logPeriodLabel = computed(
		() => this.logPeriodLabels[this.logPeriodValues.indexOf(this.logPeriod())] ?? '1 час',
	);

	readonly logSources = signal<string[]>(['backend', 'nginx', 'database', 'postgres', 'openbao', 'metrics']);
	readonly logSourceOptions = [
		{ value: 'backend', label: 'Backend' },
		{ value: 'nginx', label: 'Nginx' },
		{ value: 'database', label: 'Сервер БД' },
		{ value: 'postgres', label: 'PostgreSQL' },
		{ value: 'openbao', label: 'OpenBao' },
		{ value: 'metrics', label: 'Метрики Prometheus' },
	];

	readonly sending = signal(false);
	readonly result = signal<string | null>(null);
	readonly error = signal('');

	setArea(label: string): void {
		const index = this.areaLabels.indexOf(label);
		if (index >= 0) {
			this.area.set(this.areaValues[index] as FeedbackReport['area']);
			this.reason.set('');
			this.reasons.set([]);
			this.reasonQuery.set('');
			this.customReasonVisible.set(false);
		}
	}

	setKind(label: string): void {
		const index = this.kindLabels.indexOf(label);
		if (index >= 0) {
			this.kind.set(this.kindValues[index] as FeedbackReport['kind']);
		}
	}

	setSeverity(label: string): void {
		const index = this.severityLabels.indexOf(label);
		if (index >= 0) {
			this.severity.set(this.severityValues[index]);
		}
	}

	setVersion(label: string): void {
		this.version.set(label === 'Не выбрано' ? '' : label);
	}

	setPlatform(label: string): void {
		this.platform.set(label === 'Не выбрано' ? '' : label);
	}

	addAttachment(): void {
		this.attachments.update((items) => [...items, { label: '', url: '', enabled: true }]);
	}

	updateAttachment(index: number, field: 'label' | 'url', event: Event): void {
		const value = (event.target as HTMLInputElement).value;
		this.attachments.update((items) =>
			items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
		);
	}

	toggleAttachment(index: number): void {
		this.attachments.update((items) =>
			items.map((item, itemIndex) => (itemIndex === index ? { ...item, enabled: !item.enabled } : item)),
		);
	}

	removeAttachment(index: number): void {
		this.attachments.update((items) => items.filter((_, itemIndex) => itemIndex !== index));
	}

	addReason(label: string): void {
		if (label === 'Своя причина') {
			this.customReasonVisible.set(true);
			this.reasonQuery.set(label);

			return;
		}

		this.customReasonVisible.set(false);
		const item = FEEDBACK_REASONS.find(
			(candidate) =>
				candidate.label === label &&
				`${this.areaLabels[this.areaValues.indexOf(candidate.area)]} · ${candidate.group}` ===
				[...this.filteredGroups().labels].find((group) => group.endsWith(` · ${candidate.group}`)) &&
				!this.reasons().includes(candidate.label),
		);
		if (item) {
			this.area.set(item.area);
			this.reasons.update((items) => [...items, item.label]);
		}
	}

	addCustomReason(): void {
		const value = this.customReason().trim();
		if (value && !this.reasons().includes(value)) {
			this.reasons.update((items) => [...items, value]);
			this.customReason.set('');
		}
	}

	removeReason(value: string): void {
		this.reasons.update((items) => items.filter((item) => item !== value));
	}

	constructor() {
		this.descriptionControl.valueChanges
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe((value) => this.description.set(value));

		this.twitch.login().subscribe({
			next: (profile) => {
				this.author.set(profile?.user?.username ?? '');
				this.authenticated.set(Boolean(profile?.valid));
				this.authLoading.set(false);
			},
			error: () => {
				this.authenticated.set(false);
				this.authLoading.set(false);
			},
		});
	}

	login(): void {
		this.twitch.connect(location.protocol === 'https:' ? `${location.origin}/feedback` : undefined);
	}

	connectTelegram(): void {
		this.feedback.telegramLink().subscribe({
			next: ({ url }) => {
				this.telegramMessage.set('Открой бота и нажми Start — после этого уведомления придут в Telegram.');
				window.open(url, '_blank', 'noopener');
			},
			error: () => {
				this.telegramMessage.set('Не удалось создать ссылку для Telegram.');
			},
		});
	}

	toggleMine(): void {
		const next = !this.mineVisible();
		this.mineVisible.set(next);
		if (next) {
			this.loadMine();
		}
	}

	loadMine(): void {
		this.mineLoading.set(true);
		this.feedback.mine().subscribe({
			next: (response) => {
				this.mineItems.set(response.items);
				this.mineLoading.set(false);
			},
			error: () => {
				this.mineItems.set([]);
				this.mineLoading.set(false);
			},
		});
	}

	searchSimilar(): void {
		const query = (this.similarQuery().trim() || this.title().trim()).trim();
		if (query.length < 3) {
			this.similarItems.set([]);

			return;
		}
		this.similarLoading.set(true);
		this.feedback.similar(query).subscribe({
			next: (response) => {
				this.similarItems.set(response.items);
				this.similarLoading.set(false);
			},
			error: () => {
				this.similarItems.set([]);
				this.similarLoading.set(false);
			},
		});
	}

	statusLabel(status: string): string {
		return {
			created: 'Создано',
			feedback: 'Фидбек',
			open: 'Открыто',
			closed: 'Закрыто',
		}[status] ?? status;
	}

	setLogPeriod(label: string): void {
		const index = this.logPeriodLabels.indexOf(label);
		if (index >= 0) {
			this.logPeriod.set(this.logPeriodValues[index] ?? '1h');
		}
	}

	toggleLogSource(value: string): void {
		this.logSources.update((items) =>
			items.includes(value) ? items.filter((item) => item !== value) : [...items, value],
		);
	}

	private diagnosticsRequest(): FeedbackReport['diagnostics'] {
		if (this.kind() !== 'bug') {
			return { enabled: false, period: '1h', sources: [] };
		}

		return {
			enabled: this.diagnosticsEnabled(),
			period: this.logPeriod(),
			sources: this.logSources(),
		};
	}

	submit(): void {
		if (!this.authenticated()) {
			this.error.set('Войдите через Twitch, чтобы отправить обращение');

			return;
		}
		this.sending.set(true);
		this.error.set('');
		this.result.set(null);
		this.feedback
			.submit({
				area: this.area(),
				platform: this.platform(),
				attachments: this.attachments().filter((item) => item.url.trim()),
				reason: this.reasons()[0] ?? '',
				reasons: this.reasons(),
				kind: this.kind(),
				title: this.title(),
				description: this.description(),
				steps: this.steps(),
				expected: this.expected(),
				actual: this.actual(),
				version: this.version(),
				severity: this.severity(),
				pageUrl: this.pageUrl(),
				environment: this.environment(),
				contact: this.contact(),
				author: this.author(),
				website: this.website(),
				diagnostics: this.diagnosticsRequest(),
			})
			.subscribe({
				next: (result) => {
					this.sending.set(false);
					this.result.set(
						result.issueUrl || `${result.prefix}-${String(result.number).padStart(3, '0')}`,
					);
					this.title.set('');
					this.reasons.set([]);
					this.description.set('');
					this.descriptionControl.setValue('');
					this.steps.set('');
					this.expected.set('');
					this.actual.set('');
				},
				error: (response) => {
					this.sending.set(false);
					this.error.set(response?.error?.error ?? 'Не удалось отправить обращение');
				},
			});
	}
}
