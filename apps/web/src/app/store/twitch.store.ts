import type { TwitchUser } from '@shared/services/twitch.service';
import type { ChatJuryPublic, ChatJuryResult } from '@shared/types/chat-jury';
import type { Viewer, ViewerWatchStreakEvent } from '@shared/types/viewer';
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { TwitchService } from '@shared/services/twitch.service';
import { tap } from 'rxjs';

interface TwitchState {
	user: TwitchUser | null;
	valid: boolean | false;
	currentChatJury: ChatJuryPublic | null;
	viewers: Viewer[];
	chatJuryResult: ChatJuryResult | null;
	latestStreak: ViewerWatchStreakEvent | null;
}

const INITIAL_TWITCH_STATE: TwitchState = {
	user: null,
	valid: false,
	currentChatJury: null,
	chatJuryResult: null,
	viewers: [],
	latestStreak: null,
};

export const TWITCH_STORE = signalStore(
	{
		providedIn: 'root',
	},
	withState(INITIAL_TWITCH_STATE),
	withMethods((state, service = inject(TwitchService)) => ({
		login() {
			return service.login().pipe(
				tap((data) => {
					patchState(state, {
						user: data.user,
						valid: data.valid,
					});
				}),
			);
		},
		validateToken() {
			return service.verify().pipe(
				tap((data) => {
					patchState(state, {
						valid: data.valid,
					});
				}),
			);
		},
		getCurrentChatJury() {
			return service.getCurrentChatJury().pipe(
				tap((data) => {
					patchState(state, {
						currentChatJury: data,
					});
				}),
			);
		},
		getChatJuryResult() {
			return service.getChatJuryResult().pipe(
				tap((data) => {
					patchState(state, {
						chatJuryResult: data,
					});
				}),
			);
		},
	})),
	withComputed((state) => ({
		currentUser: computed(() => state.user()),
		chatJury: computed(() => state.currentChatJury()),
		viewers: computed(() => state.viewers()),
		latestStreak: computed(() => state.latestStreak()),
	})),
);
