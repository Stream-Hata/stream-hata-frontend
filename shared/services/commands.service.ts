import type { ChatCommand, MessageTimer, TwitchReward, TwitchRewardsState } from '@shared/types/automation';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CommandsService {
	private readonly http = inject(HttpClient);

	list() {
		return this.http.get<{ commands: ChatCommand[] }>('rgg-sync/commands');
	}

	save(command: Partial<ChatCommand>) {
		return this.http.post<ChatCommand>('rgg-sync/commands', command);
	}

	setEnabled(id: string, enabled: boolean) {
		return this.http.patch<ChatCommand>(`rgg-sync/commands/${id}`, { enabled });
	}

	remove(id: string) {
		return this.http.delete<void>(`rgg-sync/commands/${id}`);
	}

	test(id: string) {
		return this.http.get<{ response: string }>(`rgg-sync/commands/${id}/test`);
	}

	rewards() {
		return this.http.get<TwitchRewardsState>('rgg-sync/twitch-rewards');
	}

	saveReward(reward: Partial<TwitchReward> & { action?: string; payload?: string }) {
		return reward.id
			? this.http.patch<{ reward: TwitchReward }>('rgg-sync/twitch-rewards', reward)
			: this.http.post<{ reward: TwitchReward }>('rgg-sync/twitch-rewards', reward);
	}

	removeReward(id: string) {
		return this.http.delete<void>(`rgg-sync/twitch-rewards/${id}`);
	}

	timers() {
		return this.http.get<{ timers: MessageTimer[] }>('rgg-sync/timers');
	}

	saveTimer(timer: Partial<MessageTimer>) {
		return this.http.post<MessageTimer>('rgg-sync/timers', timer);
	}

	removeTimer(id: string) {
		return this.http.delete<void>(`rgg-sync/timers/${id}`);
	}
}
