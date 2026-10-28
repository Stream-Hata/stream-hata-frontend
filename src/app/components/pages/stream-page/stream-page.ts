import type { NotifySettings, ObsStatus, StreamInfo } from '@shared/types/stream';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NotifyService, ObsService, StreamService } from '@shared/services/stream.services';
import { TuiButton, TuiIcon, TuiInput, TuiTextfield } from '@taiga-ui/core';
import { TuiBadge, TuiButtonCopy, TuiSwitch } from '@taiga-ui/kit';
import { Timer as HotbarTimer } from '../../hotbar/timer/timer';
import { TimerPreview } from '../../widgets/timer-preview/timer-preview';
import { catchError, merge, of, switchMap, timer } from 'rxjs';

@Component({
	imports: [
		TuiBadge,
		TuiButton,
		TuiButtonCopy,
		TuiIcon,
		TuiInput,
		TuiSwitch,
		TuiTextfield,
		HotbarTimer,
		TimerPreview,
	],
	selector: 'app-stream-page',
	styleUrl: './stream-page.scss',
	templateUrl: './stream-page.html',
})
export default class StreamPage {
	private readonly obs = inject(ObsService);
	private readonly stream = inject(StreamService);
	private readonly notify = inject(NotifyService);
	private readonly destroyRef = inject(DestroyRef);

	readonly refresh = signal(0);

	readonly obsStatus = toSignal(
		merge(timer(0, 5000), toObservable(this.refresh)).pipe(
			switchMap(() => this.obs.status().pipe(catchError(() => of(null as ObsStatus | null)))),
		),
		{ initialValue: null as ObsStatus | null },
	);

	readonly streamInfo = toSignal(
		merge(timer(0, 20000), toObservable(this.refresh)).pipe(
			switchMap(() => this.stream.info().pipe(catchError(() => of(null as StreamInfo | null)))),
		),
		{ initialValue: null as StreamInfo | null },
	);

	readonly notifySettings = toSignal(
		merge(timer(0, 30000), toObservable(this.refresh)).pipe(
			switchMap(() => this.notify.settings().pipe(catchError(() => of(null)))),
		),
		{ initialValue: null },
	);

	readonly obsUrl = signal('ws://127.0.0.1:4455');
	readonly obsPassword = signal('');
	readonly obsError = signal<string | null>(null);

	readonly title = signal('');
	readonly gameQuery = signal('');
	readonly streamSaved = signal(false);

	readonly discordWebhook = signal('');
	readonly telegramToken = signal('');
	readonly telegramChatId = signal('');
	readonly notifySaved = signal(false);

	private infoLoaded = false;
	private notifyLoaded = false;
	private autoObsTried = false;
	readonly desktop = navigator.userAgent.includes('NamelessStreamHataDesktop') || '__TAURI_INTERNALS__' in window;

	constructor() {
		this.stream
			.info()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (info) => {
					if (!this.infoLoaded && info) {
						this.infoLoaded = true;
						this.title.set(info.title);
						this.gameQuery.set(info.gameName);
					}
				},
				error: () => undefined,
			});

		this.notify
			.settings()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (settings) => {
					if (!this.notifyLoaded && settings) {
						this.notifyLoaded = true;
						this.applyNotify(settings);
					}
				},
				error: () => undefined,
			});

		if (this.desktop) {
			setTimeout(() => this.autoConnectObs(), 1500);
		}
	}

	private autoConnectObs(): void {
		if (this.autoObsTried || this.obsStatus()?.connected) {
			return;
		}

		this.autoObsTried = true;
		this.obs.connect('ws://127.0.0.1:4455', '').pipe(
			catchError(() => this.obs.connect('ws://localhost:4455', '')),
		).subscribe({
			next: () => this.refresh.update((value) => value + 1),
			error: () => undefined,
		});
	}

	get deckUrl(): string {
		return `${location.origin}/rgg-sync/actions`;
	}

	check(event: Event): boolean {
		return (event.target as HTMLInputElement).checked;
	}

	value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}

	connectObs(): void {
		this.obsError.set(null);

		this.obs.connect(this.obsUrl(), this.obsPassword()).subscribe({
			next: () => {
				this.obsPassword.set('');
				this.refresh.update((v) => v + 1);
			},
			error: (response) => {
				this.obsError.set(response.error?.error ?? 'Не удалось подключиться к OBS');
			},
		});
	}

	disconnectObs(): void {
		this.obs.disconnect().subscribe(() => this.refresh.update((v) => v + 1));
	}

	setScene(scene: string): void {
		this.obs.scene(scene).subscribe(() => this.refresh.update((v) => v + 1));
	}

	toggleMute(input: string): void {
		this.obs.mute(input).subscribe(() => this.refresh.update((v) => v + 1));
	}

	output(output: string, action: string): void {
		this.obs.output(output, action).subscribe(() => this.refresh.update((v) => v + 1));
	}

	saveStream(): void {
		this.stream.update(this.title().trim(), this.gameQuery().trim()).subscribe({
			next: () => this.flash(this.streamSaved),
			error: () => undefined,
		});
	}

	toggleShield(event: Event): void {
		this.stream.shield(this.check(event)).subscribe(() => this.refresh.update((v) => v + 1));
	}

	adBreak(length: number): void {
		this.stream.commercial(length).subscribe();
	}

	saveNotify(): void {
		const current = this.notifySettings();

		if (!current) {
			return;
		}

		this.notify
			.save({
				...current,
				discordWebhook: this.discordWebhook(),
				telegramToken: this.telegramToken(),
				telegramChatId: this.telegramChatId(),
				digest: this.notifySettings()?.digest ?? true,
			})
			.subscribe(() => this.flash(this.notifySaved));
	}

	toggleNotify(field: keyof NotifySettings, event: Event): void {
		const current = this.notifySettings();

		if (!current) {
			return;
		}

		this.notify
			.save({
				...current,
				discordWebhook: this.discordWebhook() || current.discordWebhook,
				telegramToken: this.telegramToken() || current.telegramToken,
				telegramChatId: this.telegramChatId() || current.telegramChatId,
				digest: current.digest,
				[field]: this.check(event),
			})
			.subscribe(() => this.refresh.update((v) => v + 1));
	}

	testNotify(): void {
		this.notify.test().subscribe();
	}

	private applyNotify(settings: NotifySettings): void {
		this.discordWebhook.set(settings.discordWebhook);
		this.telegramToken.set(settings.telegramToken);
		this.telegramChatId.set(settings.telegramChatId);
	}

	private flash(flag: { set: (value: boolean) => void }): void {
		flag.set(true);

		timer(1500)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => flag.set(false));
	}
}
