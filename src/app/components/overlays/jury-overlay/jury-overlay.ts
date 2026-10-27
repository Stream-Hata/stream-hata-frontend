import type { ChatJuryPublic } from '@shared/types/chat-jury';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ChatJuryService } from '@shared/services/chat-jury.service';
import { WidgetConfigService, type WidgetConfig } from '@shared/services/widgets.service';
import { catchError, of, switchMap, timer } from 'rxjs';

@Component({
	imports: [],
	selector: 'app-jury-overlay',
	styleUrl: './jury-overlay.scss',
	templateUrl: './jury-overlay.html',
})
export class JuryOverlay {
	private readonly service = inject(ChatJuryService);
	private readonly configService = inject(WidgetConfigService);

	readonly current = toSignal(
		timer(0, 2000).pipe(
			switchMap(() =>
				this.service.getCurrent().pipe(catchError(() => of(null as ChatJuryPublic | null))),
			),
		),
		{ initialValue: null as ChatJuryPublic | null },
	);

	readonly config = toSignal(
		this.configService.watch('jury').pipe(catchError(() => of({ config: {} as WidgetConfig }))),
		{ initialValue: { config: {} as WidgetConfig } },
	);
	private readonly tick = toSignal(timer(0, 1000), { initialValue: Date.now() });
	readonly showProgress = computed(() => this.config().config.juryShowProgress !== false);
	readonly showTimer = computed(() => this.config().config.juryShowTimer !== false);
	readonly yeaColor = computed(() => this.config().config.juryYeaColor ?? 'var(--status-positive)');
	readonly neiColor = computed(() => this.config().config.juryNeiColor ?? 'var(--status-negative)');
	readonly remaining = computed(() => {
		this.tick();

		const end = Date.parse(this.current()?.ends_at ?? '');

		return Number.isNaN(end) ? 0 : Math.max(0, Math.ceil((end - Date.now()) / 1000));
	});
	readonly remainingLabel = computed(() => {
		if (this.current()?.status !== 'voting') {
			return '';
		}

		const seconds = this.remaining();

		return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
	});
	readonly approval = computed(() => Math.round(this.current()?.approval_rate ?? 0));
	readonly yea = computed(() => this.current()?.votes.yea ?? 0);
	readonly nei = computed(() => this.current()?.votes.nei ?? 0);
	readonly total = computed(() => this.current()?.total ?? 0);
	readonly yeaPercent = computed(() => this.total() ? (this.yea() / this.total()) * 100 : 0);
	readonly neiPercent = computed(() => this.total() ? (this.nei() / this.total()) * 100 : 0);
	readonly question = computed(() => this.current()?.message.text ?? '');
	readonly author = computed(() => this.current()?.message.author.display_name ?? '');
	readonly verdict = computed(() => this.current()?.verdict ?? '');
	readonly confidence = computed(() => Math.round(this.current()?.message.advice_confidence ?? 0));
}
