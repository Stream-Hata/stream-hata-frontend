import type { FeedbackReport } from '@shared/services/feedback.service';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '@shared/services/feedback.service';
import { TwitchService } from '@shared/services/twitch.service';
import { TuiButton, TuiInput, TuiTextfield } from '@taiga-ui/core';
import { TuiTextarea } from '@taiga-ui/kit';

@Component({
	imports: [FormsModule, TuiButton, TuiInput, TuiTextarea, TuiTextfield],
	selector: 'app-feedback-page',
	styleUrl: './feedback-page.scss',
	templateUrl: './feedback-page.html',
})
export default class FeedbackPage {
	private readonly feedback = inject(FeedbackService);
	private readonly twitch = inject(TwitchService);

	readonly area: FeedbackReport['area'] = 'frontend';
	readonly kind: FeedbackReport['kind'] = 'bug';
	readonly title = signal('');
	readonly description = signal('');
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

	constructor() {
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
				area: this.area,
				kind: this.kind,
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
