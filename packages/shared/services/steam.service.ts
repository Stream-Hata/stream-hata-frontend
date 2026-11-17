import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface SteamPlayer {
	steamId: string;
	personaName: string;
	profileUrl: string;
	avatar: string;
	avatarFull: string;
	status: number;
	country: string;
}

export interface SteamGame {
	appId: number;
	name: string;
	playtimeMinutes: number;
	iconUrl: string;
}

export interface SteamMe {
	linked: boolean;
	player?: SteamPlayer;
	gameCount?: number;
	items?: SteamLibraryGame[];
}

export interface SteamLibraryGame extends SteamGame {
	achievements: number;
	streamhataSlug?: string;
}

export interface SteamAchievement {
	appId: number;
	gameName: string;
	apiName: string;
	name: string;
	description: string;
	iconUrl: string;
	achieved: boolean;
	unlockTime: number;
}

export interface SteamInventoryItem {
	id: string;
	name: string;
	type: string;
	iconUrl: string;
	amount: number;
	tradable: boolean;
	marketHashName?: string;
}

@Injectable({ providedIn: 'root' })
export class SteamService {
	private readonly http = inject(HttpClient);

	me() {
		return this.http.get<SteamMe>('rgg-sync/steam/me');
	}

	library() {
		return this.http.get<{ items: SteamLibraryGame[]; count: number }>('rgg-sync/steam/library');
	}

	inventory() {
		return this.http.get<{ items: SteamInventoryItem[]; count: number }>(
			'rgg-sync/steam/inventory',
		);
	}

	achievements() {
		return this.http.get<{ items: SteamAchievement[]; count: number }>(
			'rgg-sync/steam/achievements',
		);
	}

	link(): void {
		location.assign('/rgg-sync/steam/authorize');
	}

	unlink() {
		return this.http.post<{ ok: boolean }>('rgg-sync/steam/unlink', {});
	}
}
