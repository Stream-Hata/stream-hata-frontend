import type { ChatJuryPublic } from '@shared/types/chat-jury';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ChatJuryService } from '@shared/services/chat-jury.service';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { catchError, of, switchMap, timer } from 'rxjs';
import { ApprovalRing } from '../../ui/approval-ring/approval-ring';

@Component({
	imports: [RouterLink, TuiBadge, TuiButton, TuiIcon, ApprovalRing],
	selector: 'app-chat-jury-page',
	styleUrl: './chat-jury-page.scss',
	templateUrl: './chat-jury-page.html',
})
export default class ChatJuryPage {
	private readonly service = inject(ChatJuryService);

	readonly jury = toSignal(
		timer(0, 2000).pipe(
			switchMap(() =>
				this.service.getCurrent().pipe(catchError(() => of(null as ChatJuryPublic | null))),
			),
		),
		{ initialValue: null as ChatJuryPublic | null },
	);

	private readonly tick = toSignal(timer(0, 1000), { initialValue: 0 });

	readonly voting = computed(() => this.jury()?.status === 'voting');

	readonly approvalPercent = computed(() => Math.round((this.jury()?.approval_rate ?? 0) * 100));

	readonly confidencePercent = computed(() =>
		Math.round((this.jury()?.message.advice_confidence ?? 0) * 100),
	);

	readonly yeaPercent = computed(() => this.percent(this.jury()?.votes.yea ?? 0));
	readonly neiPercent = computed(() => this.percent(this.jury()?.votes.nei ?? 0));

	readonly remainingSeconds = computed(() => {
		this.tick();

		const current = this.jury();

		if (!current || current.status !== 'voting') {
			return 0;
		}

		const endsAt = Date.parse(current.ends_at);

		if (Number.isNaN(endsAt)) {
			return 0;
		}

		return Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
	});

	readonly remainingLabel = computed(() => {
		const seconds = this.remainingSeconds();
		const minutes = Math.floor(seconds / 60);

		return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
	});

	readonly countdownProgress = computed(() => {
		const current = this.jury();

		if (!current) {
			return 0;
		}

		const start = Date.parse(current.started_at);
		const end = Date.parse(current.ends_at);

		if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
			return 0;
		}

		const total = end - start;
		const elapsed = Date.now() - start;

		return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
	});

	readonly ending = computed(() => this.voting() && this.remainingSeconds() <= 10);

	startTest(): void {
		this.service.startTest('Стоит ли послушать этот совет?').subscribe();
	}

	stop(): void {
		this.service.finish().subscribe();
	}

	percent(value: number): number {
		const total = this.jury()?.total ?? 0;

		return total === 0 ? 0 : Math.round((value / total) * 100);
	}

	formatDate(value: string): string {
		const date = new Date(value);

		return Number.isNaN(date.getTime())
			? '—'
			: date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
	}
}
