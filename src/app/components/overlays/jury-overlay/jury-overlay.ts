import type { ChatJuryPublic } from '@shared/types/chat-jury';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ChatJuryService } from '@shared/services/chat-jury.service';
import { catchError, of, switchMap, timer } from 'rxjs';
import { ApprovalRing } from '../../ui/approval-ring/approval-ring';

@Component({
	imports: [ApprovalRing],
	selector: 'app-jury-overlay',
	styleUrl: './jury-overlay.scss',
	templateUrl: './jury-overlay.html',
})
export class JuryOverlay {
	private readonly service = inject(ChatJuryService);

	readonly current = toSignal(
		timer(0, 2000).pipe(
			switchMap(() =>
				this.service.getCurrent().pipe(catchError(() => of(null as ChatJuryPublic | null))),
			),
		),
		{ initialValue: null as ChatJuryPublic | null },
	);

	readonly approval = computed(() => Math.round(this.current()?.approval_rate ?? 0));
	readonly yea = computed(() => this.current()?.votes.yea ?? 0);
	readonly nei = computed(() => this.current()?.votes.nei ?? 0);
	readonly total = computed(() => this.current()?.total ?? 0);
	readonly question = computed(() => this.current()?.message.text ?? '');
	readonly author = computed(() => this.current()?.message.author.display_name ?? '');
	readonly verdict = computed(() => this.current()?.verdict ?? '');
	readonly confidence = computed(() => Math.round(this.current()?.message.advice_confidence ?? 0));
}
