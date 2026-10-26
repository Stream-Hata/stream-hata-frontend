import type { TwitchResponse } from '@shared/services/twitch.service';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TwitchService } from '@shared/services/twitch.service';
import { TuiButton, TuiCheckbox, TuiIcon } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { catchError, of, switchMap, timer } from 'rxjs';

@Component({
	imports: [TuiBadge, TuiButton, TuiCheckbox, TuiIcon],
	selector: 'app-twitch-page',
	styleUrl: './twitch-page.scss',
	templateUrl: './twitch-page.html',
})
export default class TwitchPage {
	private readonly service = inject(TwitchService);

	readonly status = toSignal(
		timer(0, 10000).pipe(switchMap(() => this.service.login().pipe(catchError(() => of(null))))),
		{ initialValue: null as TwitchResponse | null },
	);

	readonly connected = computed(() => Boolean(this.status()?.valid));
	readonly name = computed(() => this.status()?.user?.displayName ?? '—');
	readonly login = computed(() => this.status()?.user?.username ?? '');
	readonly followers = computed(() => this.status()?.state?.followers ?? 0);
	readonly subscribers = computed(() => this.status()?.state?.subscribers ?? 0);
	readonly chatters = computed(() => this.status()?.state?.chatters ?? 0);

	connect(): void {
		this.service.connect();
	}

	disconnect(): void {
		this.service.disconnect().subscribe();
	}
}
