import type { WidgetConfig } from '@shared/services/widgets.service';
import type { DonationAnimation, DonationLayout, DonationPosition, DonationTtsProvider, DonationWidgetConfig } from '@shared/types/donation';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TtsService } from '@shared/services/tts.service';
import { WidgetConfigService } from '@shared/services/widgets.service';
import { donationConfig } from '@shared/types/donation';
import { TuiButton, TuiDropdown, TuiInput, TuiSelectLike, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiDataListWrapper, TuiInputColor, TuiInputNumber, TuiSwitch, TuiTextarea } from '@taiga-ui/kit';
import { catchError, of } from 'rxjs';
import { DonationCard } from '../donation-card/donation-card';
import { DonationGoalBar } from '../donation-goal/donation-goal';

@Component({
	imports: [
		ReactiveFormsModule,
		TuiButton,
		TuiChevron,
		TuiDataListWrapper,
		TuiDropdown,
		TuiInput,
		TuiInputColor,
		TuiInputNumber,
		TuiSelectLike,
		TuiSwitch,
		TuiTextarea,
		TuiTextfield,
		DonationCard,
		DonationGoalBar,
	],
	selector: 'app-donation-config',
	styleUrl: './donation-config.scss',
	templateUrl: './donation-config.html',
})
export class DonationConfig {
	private readonly widgetConfig = inject(WidgetConfigService);
	private readonly tts = inject(TtsService);
	private readonly destroyRef = inject(DestroyRef);
	private base: WidgetConfig = {};
	readonly saved = signal('');
	readonly previewEvent = { id: 'preview', provider: 'test', type: 'donation', username: 'zritel', message: 'Спасибо за стрим!', amount: 500, currency: 'RUB', createdAt: new Date().toISOString() };
	readonly form = new FormGroup({
		minAmount: new FormControl(0, { nonNullable: true }),
		durationSeconds: new FormControl(10, { nonNullable: true }),
		maxRows: new FormControl(5, { nonNullable: true }),
		width: new FormControl(460, { nonNullable: true }),
		scale: new FormControl(1, { nonNullable: true }),
		showAmount: new FormControl(true, { nonNullable: true }),
		showMessage: new FormControl(true, { nonNullable: true }),
		showTable: new FormControl(true, { nonNullable: true }),
		background: new FormControl('rgba(18, 18, 24, 0.92)', { nonNullable: true }),
		textColor: new FormControl('#F5EAFF', { nonNullable: true }),
		accentColor: new FormControl('#FF2EA6', { nonNullable: true }),
		borderColor: new FormControl('rgba(255, 255, 255, 0.12)', { nonNullable: true }),
		glowColor: new FormControl('rgba(255, 46, 166, 0.35)', { nonNullable: true }),
		blur: new FormControl(16, { nonNullable: true }),
		fontFamily: new FormControl('Inter', { nonNullable: true }),
		soundUrl: new FormControl('', { nonNullable: true }),
		soundVolume: new FormControl(70, { nonNullable: true }),
		ttsEnabled: new FormControl(false, { nonNullable: true }),
		ttsVoice: new FormControl('troy', { nonNullable: true }),
		ttsModel: new FormControl('canopylabs/orpheus-v1-english', { nonNullable: true }),
		ttsVolume: new FormControl(80, { nonNullable: true }),
		ttsMinAmount: new FormControl(0, { nonNullable: true }),
		ttsTemplate: new FormControl('Донат от {user} на {amount} {currency}. {message}', { nonNullable: true }),
		kicker: new FormControl('ДОНАТ', { nonNullable: true }),
		goalsEnabled: new FormControl(true, { nonNullable: true }),
		goalWidth: new FormControl(460, { nonNullable: true }),
		goalBackground: new FormControl('rgba(18, 18, 24, 0.92)', { nonNullable: true }),
		goalAccent: new FormControl('#39FF88', { nonNullable: true }),
		goalTextColor: new FormControl('#F5EAFF', { nonNullable: true }),
		goalShowPercent: new FormControl(true, { nonNullable: true }),
		goalShowAmounts: new FormControl(true, { nonNullable: true }),
		goalManualTitle: new FormControl('Цель стрима', { nonNullable: true }),
		goalManualCurrent: new FormControl(0, { nonNullable: true }),
		goalManualTarget: new FormControl(10000, { nonNullable: true }),
		goalManualCurrency: new FormControl('RUB', { nonNullable: true }),
	});

	readonly layoutLabels = ['Карточка', 'Таблица', 'Карточка + таблица'];
	readonly positionLabels = ['Сверху слева', 'Сверху центр', 'Сверху справа', 'Слева', 'Центр', 'Справа', 'Снизу слева', 'Снизу центр', 'Снизу справа'];
	readonly animationLabels = ['Pop', 'Slide Up', 'Slide Left', 'Flip', 'Glitch', 'Bounce'];
	readonly providerLabels = ['Авто', 'Groq', 'Fish Audio', 'Браузер'];
	readonly layoutText = signal('Карточка + таблица');
	readonly positionText = signal('Сверху справа');
	readonly animationText = signal('Pop');
	readonly providerText = signal('Авто');
	readonly voices = signal(['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy', 'michael', 'sophia']);
	readonly previewConfig = computed(() => donationConfig({ ...this.form.getRawValue(), layout: this.layoutValue(), position: this.positionValue(), animation: this.animationValue(), ttsProvider: this.providerValue() } as Partial<DonationWidgetConfig>));
	readonly previewGoal = computed(() => ({
		id: 'preview-goal',
		provider: 'manual',
		title: this.form.controls.goalManualTitle.value,
		currency: this.form.controls.goalManualCurrency.value,
		startAmount: 0,
		raisedAmount: this.form.controls.goalManualCurrent.value,
		goalAmount: this.form.controls.goalManualTarget.value,
		active: true,
		updatedAt: new Date().toISOString(),
	}));
	readonly previewRows = computed(() => [
		{ ...this.previewEvent, id: 'preview-2', username: 'nightbot', message: 'Крутой стрим', amount: 250 },
		{ ...this.previewEvent, id: 'preview-3', username: 'grep_ban', message: 'На игру', amount: 1000 },
		{ ...this.previewEvent, id: 'preview-4', username: 'viewer', message: '', amount: 50 },
	]);

	constructor() {
		this.widgetConfig
			.get('donations')
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((response) => {
				this.base = response?.config ?? {};
				this.apply(donationConfig(this.base.donation));
			});

		this.tts
			.voices()
			.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
			.subscribe((voices) => {
				if (voices?.voices.length) {
					this.voices.set(voices.voices);
				}
			});
	}

	layoutValue(): DonationLayout {
		return (['card', 'table', 'combined'] as const)[this.layoutLabels.indexOf(this.layoutText())] ?? 'combined';
	}

	positionValue(): DonationPosition {
		return (['top-left', 'top-center', 'top-right', 'middle-left', 'center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const)[this.positionLabels.indexOf(this.positionText())] ?? 'top-right';
	}

	animationValue(): DonationAnimation {
		return (['pop', 'slide-up', 'slide-left', 'flip', 'glitch', 'bounce'] as const)[this.animationLabels.indexOf(this.animationText())] ?? 'pop';
	}

	providerValue(): DonationTtsProvider {
		return (['auto', 'groq', 'fishaudio', 'browser'] as const)[this.providerLabels.indexOf(this.providerText())] ?? 'auto';
	}

	testSound(): void {
		const url = this.form.controls.soundUrl.value.trim();

		if (url) {
			const audio = new Audio(url);
			audio.volume = this.form.controls.soundVolume.value / 100;
			void audio.play().catch(() => undefined);
		}
	}

	testTts(): void {
		const text = 'Привет! Это тест озвучки доната.';

		if (this.providerValue() === 'browser') {
			this.browserSpeech(text);

			return;
		}

		this.tts
			.speak(
				'',
				text,
				this.form.controls.ttsVoice.value,
				this.form.controls.ttsModel.value,
				this.providerValue(),
			)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (result) => {
					if (result.url) {
						void new Audio(result.url).play().catch(() => undefined);
					}
				},
				error: () => this.browserSpeech(text),
			});
	}

	save(): void {
		const config: WidgetConfig = {
			...this.base,
			donation: this.previewConfig(),
		};

		this.widgetConfig
			.save('donations', config)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.saved.set('Сохранено');
				setTimeout(() => this.saved.set(''), 1500);
			});
	}

	private apply(config: DonationWidgetConfig): void {
		this.form.patchValue(config, { emitEvent: false });
		this.layoutText.set(this.layoutLabels[['card', 'table', 'combined'].indexOf(config.layout)] ?? 'Карточка + таблица');
		this.positionText.set(this.positionLabels[['top-left', 'top-center', 'top-right', 'middle-left', 'center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'].indexOf(config.position)] ?? 'Сверху справа');
		this.animationText.set(this.animationLabels[['pop', 'slide-up', 'slide-left', 'flip', 'glitch', 'bounce'].indexOf(config.animation)] ?? 'Pop');
		this.providerText.set(this.providerLabels[['auto', 'groq', 'fishaudio', 'browser'].indexOf(config.ttsProvider)] ?? 'Авто');
	}

	private browserSpeech(text: string): void {
		if (typeof speechSynthesis === 'undefined') {
			return;
		}

		const utterance = new SpeechSynthesisUtterance(text);
		const voices = speechSynthesis.getVoices();
		const voice = voices.find((item) => item.lang.startsWith('ru'));

		if (voice) {
			utterance.voice = voice;
		}

		utterance.lang = voice?.lang ?? 'ru-RU';
		utterance.volume = this.form.controls.ttsVolume.value / 100;
		speechSynthesis.speak(utterance);
	}
}
