import type { FeedbackReport } from '@shared/services/feedback.service';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FeedbackService } from '@shared/services/feedback.service';
import { FEEDBACK_REASONS } from '@shared/config/feedback-reasons';
import { TwitchService } from '@shared/services/twitch.service';
import { TuiButton, TuiDropdown, TuiInput, TuiSelectLike, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiDataListWrapper, TuiTextarea } from '@taiga-ui/kit';
import { TuiEditor, provideTuiEditor } from '@taiga-ui/editor';

@Component({
	imports: [FormsModule, ReactiveFormsModule, TuiButton, TuiChevron, TuiDataListWrapper, TuiDropdown, TuiEditor, TuiInput, TuiSelectLike, TuiTextarea, TuiTextfield],
	selector: 'app-feedback-page',
	providers: [provideTuiEditor()],
	styleUrl: './feedback-page.scss',
	templateUrl: './feedback-page.html',
})
export default class FeedbackPage {
	private readonly feedback = inject(FeedbackService);
	private readonly twitch = inject(TwitchService);

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
	readonly severityLabel = computed(() => this.severityLabels[this.severityValues.indexOf(this.severity())] ?? 'Средняя');
	readonly pageUrl = signal('');
	readonly environment = signal('');
	readonly contact = signal('');
	readonly website = signal('');
	readonly author = signal('');
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
		this.descriptionControl.valueChanges.subscribe((value) => this.description.set(value));

		this.twitch.login().subscribe((profile) => {
			this.author.set(profile?.user?.username ?? '');
		});
	}

	submit(): void {
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
