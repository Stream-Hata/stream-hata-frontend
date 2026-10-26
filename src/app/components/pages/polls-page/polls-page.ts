import type { PollsState } from '@shared/types/automation';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { PollsService } from '@shared/services/engagement.services';
import {
	TuiTable,
	TuiTableTbody,
	TuiTableTd,
	TuiTableTh,
	TuiTableThead,
} from '@taiga-ui/addon-table';
import { TuiButton, TuiIcon, TuiInput, TuiTextfield } from '@taiga-ui/core';
import {
	TuiInputNumber, TuiBadge, TuiTextarea } from '@taiga-ui/kit';
import { catchError, merge, of, switchMap, timer } from 'rxjs';

const EMPTY: PollsState = { current: null, prediction: null, history: [] };

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
	day: 'numeric',
	month: 'short',
	hour: '2-digit',
	minute: '2-digit',
};

@Component({
	imports: [
		
		TuiInputNumber,TuiBadge,
		TuiButton,
		TuiIcon,
		TuiInput,
		TuiTable,
		TuiTableTbody,
		TuiTableTd,
		TuiTableTh,
		TuiTableThead,
		TuiTextarea,
		TuiTextfield,
	],
	selector: 'app-polls-page',
	styleUrl: './polls-page.scss',
	templateUrl: './polls-page.html',
})
export default class PollsPage {
	private readonly service = inject(PollsService);

	readonly refresh = signal(0);

	readonly state = toSignal(
		merge(timer(0, 5000), toObservable(this.refresh)).pipe(
			switchMap(() => this.service.getState().pipe(catchError(() => of(EMPTY)))),
		),
		{ initialValue: EMPTY },
	);

	readonly title = signal('');
	readonly choices = signal('Спрятаться\nСражаться');
	readonly duration = signal(120);
	readonly error = signal<string | null>(null);

	readonly totalVotes = computed(() =>
		(this.state().current?.choices ?? []).reduce((sum, choice) => sum + choice.votes, 0),
	);

	create(): void {
		this.error.set(null);

		const list = this.choices()
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);

		this.service
			.create(this.title().trim() || 'Голосование чата', list, this.duration())
			.subscribe({
				next: () => {
					this.title.set('');
					this.refresh.update((v) => v + 1);
				},
				error: (response) => {
					this.error.set(response.error?.error ?? 'Не удалось создать опрос');
				},
			});
	}

	end(): void {
		this.service.end().subscribe(() => this.refresh.update((v) => v + 1));
	}

	percent(votes: number): number {
		const total = this.totalVotes();

		return total === 0 ? 0 : Math.round((votes / total) * 100);
	}

	predictionPercent(votes: number): number {
		const outcomes = this.state().prediction?.outcomes ?? [];
		const total = outcomes.reduce((sum, outcome) => sum + outcome.votes, 0);

		return total === 0 ? 0 : Math.round((votes / total) * 100);
	}

	value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}

	formatDate(value: string): string {
		const date = new Date(value);

		return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU', DATE_FORMAT);
	}
}
