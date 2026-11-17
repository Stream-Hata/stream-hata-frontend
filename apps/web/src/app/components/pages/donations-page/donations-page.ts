import type { DonationsSnapshot } from '@shared/types/donation';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DonationsService } from '@shared/services/donations.service';
import {
	TuiTable,
	TuiTableTbody,
	TuiTableTd,
	TuiTableTh,
	TuiTableThead,
} from '@taiga-ui/addon-table';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { catchError, of, switchMap, timer } from 'rxjs';

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
	day: 'numeric',
	month: 'short',
	hour: '2-digit',
	minute: '2-digit',
};

const EMPTY: DonationsSnapshot = {
	recent: [],
	stats: { totalCount: 0, totals: {}, today: {}, top: [] },
	providers: [],
	goals: [],
};

@Component({
	imports: [
		RouterLink,
		TuiBadge,
		TuiButton,
		TuiIcon,
		TuiTable,
		TuiTableTbody,
		TuiTableTd,
		TuiTableTh,
		TuiTableThead,
	],
	selector: 'app-donations-page',
	styleUrl: './donations-page.scss',
	templateUrl: './donations-page.html',
})
export default class DonationsPage {
	private readonly service = inject(DonationsService);
	readonly authError = signal('');

	readonly snapshot = toSignal(
		timer(0, 5000).pipe(
			switchMap(() => this.service.getSnapshot().pipe(catchError(() => of(EMPTY)))),
		),
		{ initialValue: EMPTY },
	);

	readonly totalsLine = computed(() => this.formatMoney(this.snapshot().stats.totals));
	readonly todayLine = computed(() => this.formatMoney(this.snapshot().stats.today));
	readonly topDonator = computed(() => this.snapshot().stats.top[0] ?? null);

	stateTone(state: string): string {
		if (state === 'connected' || state === 'listening') {
			return 'positive';
		}

		if (state === 'error') {
			return 'negative';
		}

		return 'neutral';
	}

	connectDonationAlerts(): void {
		this.authError.set('');
		this.service.getDonationAlertsAuthUrl().subscribe({
			next: ({ url }) => location.assign(url),
			error: (response) => this.authError.set(response.error?.error ?? 'DonationAlerts не настроен'),
		});
	}

	stateLabel(state: string): string {
		return {
			connected: 'Подключено',
			listening: 'Подключено',
			disconnected: 'Не подключено',
			error: 'Ошибка',
		}[state] ?? state;
	}

	providerLabel(name: string): string {
		return {
			donationalerts: 'DonationAlerts',
			kofi: 'Ko-fi',
			donationto: 'DonationTo',
			donatestream: 'Donate.stream',
			donatepay: 'DonatePay',
			generic: 'Универсальный вебхук',
		}[name] ?? name;
	}

	formatAmount(amount: number, currency: string): string {
		return `${amount.toLocaleString('ru-RU')} ${currencySymbol(currency)}`;
	}

	formatDuration(seconds: number): string {
		const minutes = Math.floor(seconds / 60);
		const rest = seconds % 60;

		return `${minutes}:${String(rest).padStart(2, '0')}`;
	}

	formatTime(value: string): string {
		if (!value) {
			return '—';
		}

		const date = new Date(value);

		return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ru-RU', DATE_FORMAT);
	}

	private formatMoney(values: Record<string, number>): string {
		const entries = Object.entries(values).filter(([, sum]) => sum > 0);

		if (entries.length === 0) {
			return '—';
		}

		return entries.map(([currency, sum]) => this.formatAmount(sum, currency)).join(' · ');
	}
}

function currencySymbol(currency: string): string {
	switch (currency) {
		case 'RUB':
			return '₽';
		case 'USD':
			return '$';
		case 'EUR':
			return '€';
		default:
			return currency;
	}
}
