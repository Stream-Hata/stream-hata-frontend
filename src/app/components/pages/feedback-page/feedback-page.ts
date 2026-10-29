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
	readonly reason = signal('');
	readonly reasonQuery = signal('');
	readonly areaValues = ['frontend', 'backend', 'desktop'];
	readonly areaLabels = ['Frontend', 'Backend', 'Desktop'];
	readonly kindValues = ['bug', 'suggestion', 'feedback'];
	readonly kindLabels = ['Баг', 'Предложение', 'Фидбек'];
	readonly reasonsForArea = computed(() => FEEDBACK_REASONS);
	readonly reasonLabels = computed(() =>
		this.reasonsForArea().map((item) => `${this.areaLabels[this.areaValues.indexOf(item.area)]} · ${item.group} · ${item.label}`),
	);
	readonly filteredReasons = computed(() => {
		const query = this.reasonQuery().trim().toLowerCase();
		const labels = this.reasonLabels();
		return query ? labels.filter((item) => item.toLowerCase().includes(query)) : labels;
	});
	readonly title = signal('');
	readonly description = signal('');
	readonly descriptionControl = new FormControl('', { nonNullable: true });
	readonly steps = signal('');
	readonly expected = signal('');
	readonly actual = signal('');
	readonly version = signal('');
	readonly severity = signal('medium');
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
			this.reasonQuery.set('');
		}
	}

	setKind(label: string): void {
		const index = this.kindLabels.indexOf(label);
		if (index >= 0) {
			this.kind.set(this.kindValues[index] as FeedbackReport['kind']);
		}
	}

	setReason(label: string): void {
		const item = this.reasonsForArea().find(
			(candidate) =>
				`${this.areaLabels[this.areaValues.indexOf(candidate.area)]} · ${candidate.group} · ${candidate.label}` === label,
		);
		if (item) {
			this.area.set(item.area);
			this.reason.set(item.value);
			this.reasonQuery.set(label);
		}
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
				reason: this.reason(),
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
