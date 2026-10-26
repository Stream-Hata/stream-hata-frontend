import type { SteamMe } from '@shared/services/steam.service';
import type { TwitchResponse } from '@shared/services/twitch.service';
import { computed, inject, Injectable, signal } from '@angular/core';
import { SteamService } from '@shared/services/steam.service';
import { TwitchService } from '@shared/services/twitch.service';
import { catchError, forkJoin, map, Observable, of, shareReplay } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProfileDataService {
	private readonly twitchService = inject(TwitchService);
	private readonly steamService = inject(SteamService);

	readonly twitch = signal<TwitchResponse | null>(null);
	readonly steam = signal<SteamMe | null>(null);
	readonly loaded = signal(false);
	readonly loading = computed(() => !this.loaded());
	private inFlight: Observable<boolean> | null = null;
	private loadedAt = 0;

	load(force = false): Observable<boolean> {
		if (!force && this.loaded() && Date.now() - this.loadedAt < 30_000) {
			return of(true);
		}

		if (this.inFlight) {
			return this.inFlight;
		}

		const request = forkJoin({
			twitch: this.twitchService.login().pipe(catchError(() => of(null as TwitchResponse | null))),
			steam: this.steamService.me().pipe(catchError(() => of(null as SteamMe | null))),
		}).pipe(
			map(({ twitch, steam }) => {
				this.twitch.set(twitch);
				this.steam.set(steam);
				this.loaded.set(true);
				this.loadedAt = Date.now();

				return true;
			}),
			shareReplay({ bufferSize: 1, refCount: false }),
		);

		this.inFlight = request;

		request.subscribe({
			complete: () => {
				this.inFlight = null;
			},
			error: () => {
				this.loaded.set(true);
				this.loadedAt = Date.now();
				this.inFlight = null;
			},
		});

		return request;
	}
}
