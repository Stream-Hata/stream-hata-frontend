import type { ChatJuryPublic, ChatJuryResult } from '@shared/types/chat-jury';
import type { ViewerListResponse, ViewerWatchStreakEvent } from '@shared/types/viewer';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface TwitchStream {
	online: boolean;
	id: string;
	title: string;
	gameId: string;
	gameName: string;
	viewerCount: string;
	startedAt: string;
	language: string;
	thumbnailUrl: string;
	tags: string;
}

export interface TwitchUser {
	id: number;
	twitchId: string;
	username: string;
	displayName: string;
	avatar?: string;
}

export interface TwitchUserState {
	followers: number;
	subscribers: number;
	chatters: number;
}

export interface TwitchResponse {
	valid: boolean;
	user: TwitchUser;
	state: TwitchUserState;
	steam: TwitchStream;
}

@Injectable({ providedIn: 'root' })
export class TwitchService {
	private readonly http = inject(HttpClient);

	login() {
		return this.http.get<TwitchResponse>('rgg-sync/twitch');
	}

	connect(returnTo?: string, forceVerify = false) {
		const internals = (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] as
			| { invoke?: (command: string, args?: Record<string, unknown>) => Promise<unknown> }
			| undefined;

		if (internals?.invoke) {
			void internals.invoke('start_desktop_login', { force: forceVerify });

			return;
		}
		const force = forceVerify ? '&force_verify=1' : '';

		if (!returnTo) {
			location.assign(`/rgg-sync/twitch/authorize${force ? `?${force.slice(1)}` : ''}`);

			return;
		}

		location.assign(
			`/rgg-sync/twitch/authorize?return=${encodeURIComponent(returnTo)}${force}`,
		);
	}

	disconnect() {
		return this.http.post<{ valid: boolean }>('rgg-sync/twitch/logout', {});
	}

	verify() {
		return this.http.get<{ valid: boolean }>('rgg-sync/twitch/validate');
	}

	getCurrentChatJury() {
		return this.http.get<ChatJuryPublic>('rgg-sync/chat-jury/current');
	}

	getChatJuryResult() {
		return this.http.get<ChatJuryResult>('rgg-sync/chat-jury/result');
	}

	getViewers() {
		return this.http.get<ViewerListResponse>('rgg-sync/viewers');
	}

	getLatestStreak() {
		return this.http.get<ViewerWatchStreakEvent>('rgg-sync/viewers/latest-streak');
	}

	createClip() {
		return this.http.post<{ editUrl: string }>('rgg-sync/clips', {});
	}
}
