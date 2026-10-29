import type { TwitchResponse } from '@shared/services/twitch.service';
import type { AlertsState } from '@shared/types/automation';
import type { ChatJuryPublic } from '@shared/types/chat-jury';
import type { AnalyticsState } from '@shared/types/stream';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AlertsService } from '@shared/services/alerts.service';
import { ChatJuryService } from '@shared/services/chat-jury.service';
import { AnalyticsService } from '@shared/services/stream.services';
import { TwitchService } from '@shared/services/twitch.service';
import {
	TuiTable,
	TuiTableTbody,
	TuiTableTd,
	TuiTableTh,
	TuiTableThead,
} from '@taiga-ui/addon-table';
import { TuiButton, TuiIcon, TuiLink } from '@taiga-ui/core';
import { TuiBadge, TuiProgressBar } from '@taiga-ui/kit';
import { catchError, of, switchMap, timer } from 'rxjs';
import { ApprovalRing } from '../../ui/approval-ring/approval-ring';

@Component({
	imports: [
		RouterLink,
		TuiBadge,
		TuiButton,
		TuiIcon,
		TuiLink,
		TuiProgressBar,
		TuiTable,
		TuiTableTbody,
		TuiTableTd,
		TuiTableTh,
		TuiTableThead,
		ApprovalRing,
	],
	selector: 'app-dashboard-page',
	styleUrl: './dashboard-page.scss',
	templateUrl: './dashboard-page.html',
})
export default class DashboardPage {
	private readonly chatJury = inject(ChatJuryService);
	private readonly twitchService = inject(TwitchService);
	private readonly analytics = inject(AnalyticsService);
	private readonly alertsService = inject(AlertsService);

	readonly todayLabel = computed(() =>
		new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
	);

	readonly alerts = toSignal(
		timer(0, 5000).pipe(
			switchMap(() =>
				this.alertsService.getState().pipe(catchError(() => of(null as AlertsState | null))),
			),
		),
		{ initialValue: null as AlertsState | null },
	);

	readonly recentEvents = computed(() => this.alerts()?.events?.slice(0, 3) ?? []);

	readonly messageCount = computed(
		() => this.session().current?.messages ?? this.session().messages,
	);

	readonly session = toSignal(
		timer(0, 15000).pipe(
			switchMap(() =>
				this.analytics
					.state()
					.pipe(
						catchError(() => of({ current: null, history: [], messages: 0 } as AnalyticsState)),
					),
			),
		),
		{ initialValue: { current: null, history: [], messages: 0 } as AnalyticsState },
	);

	get analyticsExportUrl(): string {
		return this.analytics.exportUrl;
	}

	readonly jurySettings = toSignal(
		timer(0, 30000).pipe(
			switchMap(() => this.chatJury.getSettings().pipe(catchError(() => of(null)))),
		),
		{ initialValue: null },
	);

	readonly juryThreshold = computed(() =>
		Math.round((this.jurySettings()?.min_confidence ?? 0.6) * 100),
	);

	readonly jury = toSignal(
		timer(0, 5000).pipe(
			switchMap(() =>
				this.chatJury.getCurrent().pipe(catchError(() => of(null as ChatJuryPublic | null))),
			),
		),
		{ initialValue: null as ChatJuryPublic | null },
	);

	readonly twitch = toSignal(
		timer(0, 30000).pipe(
			switchMap(() =>
				this.twitchService.login().pipe(catchError(() => of(null as TwitchResponse | null))),
			),
		),
		{ initialValue: null as TwitchResponse | null },
	);

	readonly online = computed(() => Boolean(this.twitch()?.valid && this.twitch()?.steam?.online));
	readonly channel = computed(() => this.twitch()?.user?.displayName ?? 'не подключён');

	readonly viewers = computed(() => Number(this.twitch()?.steam?.viewerCount ?? '') || 0);

	readonly subscribers = computed(() => this.twitch()?.state?.subscribers ?? 0);
	readonly chatters = computed(() => this.twitch()?.state?.chatters ?? 0);

	readonly question = computed(() => this.jury()?.message.text ?? 'Ждём совет от чата…');

	readonly author = computed(() => this.jury()?.message.author.display_name ?? '');

	readonly confidence = computed(() =>
		Math.round((this.jury()?.message.advice_confidence ?? 0) * 100),
	);

	readonly votes = computed(() => this.jury()?.total ?? 0);

	readonly approval = computed(() => Math.round((this.jury()?.approval_rate ?? 0) * 100));

	readonly yea = computed(() => this.jury()?.votes.yea ?? 0);
	readonly nei = computed(() => this.jury()?.votes.nei ?? 0);

	readonly yeaPercent = computed(() => this.share(this.yea()));
	readonly neiPercent = computed(() => this.share(this.nei()));

	finishJury(): void {
		this.chatJury.finish().subscribe();
	}

	openClip(): void {
		this.twitchService.createClip().subscribe({
			next: ({ editUrl }) => {
				if (editUrl) {
					window.open(editUrl, '_blank', 'noopener');
				}
			},
		});
	}

	readonly verdict = computed(() => this.jury()?.verdict ?? '');

	private share(value: number): number {
		const total = this.votes();

		return total === 0 ? 0 : Math.round((value / total) * 100);
	}
}
