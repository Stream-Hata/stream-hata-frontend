import type {
	GameLastResult,
	GamesSettings,
	PointsReward,
	PointsSettings,
	PointsState,
	PollsState,
	Quote,
	RedemptionMapping,
	RedemptionsState,
	WheelRound,
	WheelState,
} from '@shared/types/automation';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PointsService {
	private readonly http = inject(HttpClient);

	getState() {
		return this.http.get<PointsState>('rgg-sync/points');
	}

	saveSettings(settings: PointsSettings) {
		return this.http.post<PointsSettings>('rgg-sync/points', settings);
	}

	saveReward(reward: Partial<PointsReward>) {
		return this.http.post<PointsReward>('rgg-sync/points/rewards', reward);
	}

	removeReward(id: string) {
		return this.http.delete<void>(`rgg-sync/points/rewards/${id}`);
	}
}

@Injectable({ providedIn: 'root' })
export class GamesService {
	private readonly http = inject(HttpClient);

	getSettings() {
		return this.http.get<GamesSettings>('rgg-sync/games');
	}

	saveSettings(settings: GamesSettings) {
		return this.http.post<GamesSettings>('rgg-sync/games', settings);
	}

	last() {
		return this.http.get<GameLastResult | null>('rgg-sync/games/last');
	}

	wheelState() {
		return this.http.get<WheelState>('rgg-sync/games/wheel');
	}

	startWheel(
		title: string,
		bet: number,
		seconds: number,
		mode?: 'spin' | 'elimination',
		test = false,
	) {
		return this.http.post<WheelRound>('rgg-sync/games/wheel/start', {
			title,
			bet,
			seconds,
			mode,
			test,
		});
	}

	spinWheel() {
		return this.http.post<WheelState>('rgg-sync/games/wheel/spin', {});
	}

	addWheelLot(name: string, bet: number, luck: boolean, viewer = '', key = '') {
		return this.http.post<WheelState>('rgg-sync/games/wheel/entry', {
			name,
			viewer,
			bet,
			luck,
			key,
		});
	}

	removeWheelLot(userId: string) {
		return this.http.delete<WheelState>(`rgg-sync/games/wheel/entry/${encodeURIComponent(userId)}`);
	}

	refundWheel() {
		return this.http.post<WheelState>('rgg-sync/games/wheel/refund', {});
	}

	resetWheel() {
		return this.http.post<WheelState>('rgg-sync/games/wheel/reset', {});
	}

	boostWheelLot(userId: string) {
		return this.http.post<{ multiplier: number; bet: number; chance: number }>(
			'rgg-sync/games/wheel/boost',
			{ userId },
		);
	}
}

@Injectable({ providedIn: 'root' })
export class QuotesService {
	private readonly http = inject(HttpClient);

	list() {
		return this.http.get<{ quotes: Quote[] }>('rgg-sync/quotes');
	}

	add(text: string, author: string) {
		return this.http.post<Quote>('rgg-sync/quotes', { text, author });
	}

	remove(id: string) {
		return this.http.delete<void>(`rgg-sync/quotes/${id}`);
	}

	vote(id: string, userId: string) {
		return this.http.post<Quote>(`rgg-sync/quotes/${id}/vote`, { userId });
	}
}

@Injectable({ providedIn: 'root' })
export class RedemptionsService {
	private readonly http = inject(HttpClient);

	getState() {
		return this.http.get<RedemptionsState>('rgg-sync/redemptions');
	}

	saveMapping(mapping: Partial<RedemptionMapping>) {
		return this.http.post<RedemptionMapping>('rgg-sync/redemptions', mapping);
	}

	removeMapping(id: string) {
		return this.http.delete<void>(`rgg-sync/redemptions/${id}`);
	}
}

@Injectable({ providedIn: 'root' })
export class PollsService {
	private readonly http = inject(HttpClient);

	getState() {
		return this.http.get<PollsState>('rgg-sync/polls');
	}

	create(title: string, choices: string[], durationSeconds: number) {
		return this.http.post<{ id: string }>('rgg-sync/polls', { title, choices, durationSeconds });
	}

	end() {
		return this.http.post<{ status: string }>('rgg-sync/polls/end', { status: 'TERMINATED' });
	}

	share(): string {
		return 'rgg-sync/polls';
	}
}
