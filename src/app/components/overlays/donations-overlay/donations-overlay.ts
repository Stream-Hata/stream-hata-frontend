import type { DonationEvent, DonationsSnapshot, DonationWidgetConfig } from '@shared/types/donation';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DonationsService } from '@shared/services/donations.service';
import { TtsService } from '@shared/services/tts.service';
import { WidgetConfigService } from '@shared/services/widgets.service';
import { donationConfig } from '@shared/types/donation';
import { catchError, map, of, switchMap, timer } from 'rxjs';
import { DonationCard } from '../../widgets/donation-card/donation-card';
import { DonationGoalBar } from '../../widgets/donation-goal/donation-goal';

const CYRILLIC = /[А-Яа-яЁё]/;

@Component({
	imports: [DonationCard, DonationGoalBar],
	selector: 'app-donations-overlay',
	styleUrl: './donations-overlay.scss',
	templateUrl: './donations-overlay.html',
})
export class DonationsOverlay {
	private readonly service = inject(DonationsService);
	private readonly widgetConfig = inject(WidgetConfigService);
	private readonly tts = inject(TtsService);
	private readonly destroyRef = inject(DestroyRef);
	private initialized = false;
	private readonly seen = new Set<string>();
	private audio: HTMLAudioElement | null = null;
	private ttsAudio: HTMLAudioElement | null = null;
	private hideTimer: ReturnType<typeof setTimeout> | null = null;

	readonly config = toSignal(
		this.widgetConfig.get('donations').pipe(
			map((response) => donationConfig(response.config.donation)),
			catchError(() => of(donationConfig(null))),
		),
		{ initialValue: donationConfig(null) },
	);

	readonly snapshot = signal<DonationsSnapshot | null>(null);
	readonly queue = signal<DonationEvent[]>([]);
	readonly active = signal<DonationEvent | null>(null);

	readonly goals = computed(() => {
		const config = this.config();
		const providerGoals = (this.snapshot()?.goals ?? []).filter((goal) => goal.active);

		if (providerGoals.length) {
			return providerGoals;
		}

		return [{
			id: 'manual',
			provider: 'manual',
			title: config.goalManualTitle,
			currency: config.goalManualCurrency,
			startAmount: 0,
			raisedAmount: config.goalManualCurrent,
			goalAmount: config.goalManualTarget,
			active: true,
			updatedAt: new Date().toISOString(),
		}];
	});
	readonly rows = computed(() => {
		const config = this.config();
		const items = (this.snapshot()?.recent ?? []).filter((event) => event.amount >= config.minAmount);

		return items.slice(0, Math.max(1, config.maxRows));
	});

	readonly positionClass = computed(() => `donation-position-${this.config().position}`);

	constructor() {
		timer(0, 1000)
			.pipe(
				switchMap(() => this.service.getSnapshot().pipe(catchError(() => of(null)))),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((snapshot) => {
				if (snapshot) {
					this.ingest(snapshot);
				}
			});

		this.destroyRef.onDestroy(() => {
			this.stopAudio();
			speechSynthesis?.cancel();
		});
	}

	private ingest(snapshot: DonationsSnapshot): void {
		this.snapshot.set(snapshot);

		if (!this.initialized) {
			this.initialized = true;

			for (const event of snapshot.recent) {
				this.seen.add(event.id);
			}

			return;
		}

		const config = this.config();
		const fresh = [...snapshot.recent]
			.reverse()
			.filter((event) => !this.seen.has(event.id) && event.amount >= config.minAmount);

		for (const event of fresh) {
			this.seen.add(event.id);
		}

		if (fresh.length) {
			this.queue.update((queue) => [...queue, ...fresh]);
			this.showNext();
		}
	}

	private showNext(): void {
		if (this.active() || !this.queue().length) {
			return;
		}

		const [next, ...rest] = this.queue();
		this.queue.set(rest);
		this.active.set(next);
		this.playDonation(next);

		const config = this.config();
		this.hideTimer = setTimeout(
			() => {
				this.active.set(null);
				this.hideTimer = null;
				this.showNext();
			},
			Math.max(2, config.durationSeconds) * 1000,
		);
	}

	private playDonation(event: DonationEvent): void {
		const config = this.config();

		if (config.soundUrl) {
			this.audio?.pause();
			this.audio = new Audio(config.soundUrl);
			this.audio.volume = Math.min(100, Math.max(0, config.soundVolume)) / 100;
			void this.audio.play().catch(() => undefined);
		}

		if (!config.ttsEnabled || event.amount < config.ttsMinAmount) {
			return;
		}

		const text = this.ttsText(event, config);

		if (config.ttsProvider === 'browser' || (config.ttsProvider === 'auto' && CYRILLIC.test(text))) {
			this.browserSpeech(text, config);

			return;
		}

		this.tts
			.speak(
				event.id,
				text,
				config.ttsVoice,
				config.ttsModel,
				config.ttsProvider,
			)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					if (result.skipped) {
						return;
					}

					if (result.url) {
						this.playTts(result.url, config);
					}
				},
				error: () => {
					if (config.ttsProvider === 'auto' && CYRILLIC.test(text)) {
						this.browserSpeech(text, config);
					}
				},
			});
	}

	private playTts(url: string, config: DonationWidgetConfig): void {
		this.ttsAudio?.pause();
		this.ttsAudio = new Audio(url);
		this.ttsAudio.volume = Math.min(100, Math.max(0, config.ttsVolume)) / 100;
		void this.ttsAudio.play().catch(() => undefined);
	}

	private browserSpeech(text: string, config: DonationWidgetConfig): void {
		if (typeof speechSynthesis === 'undefined') {
			return;
		}

		const utterance = new SpeechSynthesisUtterance(text);
		const voices = speechSynthesis.getVoices();
		const voice = voices.find((item) => item.name === config.ttsVoice) ??
			voices.find((item) => item.lang.startsWith('ru'));

		if (voice) {
			utterance.voice = voice;
		}

		utterance.lang = voice?.lang ?? 'ru-RU';
		utterance.volume = Math.min(1, Math.max(0, config.ttsVolume / 100));
		speechSynthesis.cancel();
		speechSynthesis.speak(utterance);
	}

	private ttsText(event: DonationEvent, config: DonationWidgetConfig): string {
		return config.ttsTemplate
			.replaceAll('{user}', event.username || 'Зритель')
			.replaceAll('{amount}', String(event.amount))
			.replaceAll('{currency}', event.currency)
			.replaceAll('{message}', event.message || '');
	}

	private stopAudio(): void {
		this.audio?.pause();
		this.ttsAudio?.pause();
		this.audio = null;
		this.ttsAudio = null;

		if (this.hideTimer) {
			clearTimeout(this.hideTimer);
			this.hideTimer = null;
		}
	}
}
