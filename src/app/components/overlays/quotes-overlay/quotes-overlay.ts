import type { Quote } from '@shared/types/automation';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { QuotesService } from '@shared/services/engagement.services';
import { catchError, of, switchMap, timer } from 'rxjs';

@Component({
	selector: 'app-quotes-overlay',
	styleUrl: './quotes-overlay.scss',
	templateUrl: './quotes-overlay.html',
})
export class QuotesOverlay {
	private readonly quotes = inject(QuotesService);
	readonly state = toSignal(
		timer(0, 5000).pipe(
			switchMap(() => this.quotes.list().pipe(catchError(() => of({ quotes: [] as Quote[] })))),
		),
		{ initialValue: { quotes: [] as Quote[] } },
	);
	readonly top = computed(() => [...this.state().quotes].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0)).slice(0, 8));

	vote(id: string): void {
		let userId = localStorage.getItem('nsh.quote.voter');

		if (!userId) {
			userId = `viewer-${crypto.randomUUID()}`;
			localStorage.setItem('nsh.quote.voter', userId);
		}

		this.quotes.vote(id, userId).subscribe({ error: () => undefined });
	}
}
