import type { RouletteConfig, RouletteMode } from '@shared/types/roulette';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouletteService } from '@shared/services/roulette.service';
import { DEFAULT_ROULETTE_CONFIG } from '@shared/types/roulette';
import { TuiButton, TuiDropdown, TuiInput, TuiSelectLike, TuiSlider, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiDataListWrapper, TuiInputColor, TuiInputNumber, TuiSwitch } from '@taiga-ui/kit';
import { timer } from 'rxjs';

@Component({
	imports: [
		ReactiveFormsModule,
		TuiButton,
		TuiChevron,
		TuiDropdown,
		TuiDataListWrapper,
		TuiInput,
		TuiInputColor,
		TuiInputNumber,
		TuiSelectLike,
		TuiSlider,
		TuiSwitch,
		TuiTextfield,
	],
	selector: 'app-roulette-config',
	styleUrl: './roulette-config.scss',
	templateUrl: './roulette-config.html',
})
export class RouletteConfigForm {
	private readonly roulette = inject(RouletteService);
	private readonly destroyRef = inject(DestroyRef);
	readonly saved = signal(false);
	readonly error = signal('');
	readonly form = new FormGroup({
		mode: new FormControl<RouletteMode>('classic', { nonNullable: true }),
		platforms: new FormControl('', { nonNullable: true }),
		emulator: new FormControl<'all' | 'yes' | 'no'>('all', { nonNullable: true }),
		avoidRecent: new FormControl(10, { nonNullable: true }),
		tierGold: new FormControl(2, { nonNullable: true }),
		tierDiamond: new FormControl(3, { nonNullable: true }),
		tierPlatinum: new FormControl(5, { nonNullable: true }),
		tierNone: new FormControl(1, { nonNullable: true }),
		background: new FormControl('#0F0817', { nonNullable: true }),
		accent: new FormControl('#FF2EA6', { nonNullable: true }),
		text: new FormControl('#F5EAFF', { nonNullable: true }),
		fontFamily: new FormControl('JetBrains Mono', { nonNullable: true }),
		fontUrl: new FormControl('', { nonNullable: true }),
		memeUrl: new FormControl('', { nonNullable: true }),
		musicUrl: new FormControl('', { nonNullable: true }),
		revealUrl: new FormControl('', { nonNullable: true }),
		volume: new FormControl(70, { nonNullable: true }),
		durationSeconds: new FormControl(12, { nonNullable: true }),
		showCat: new FormControl(true, { nonNullable: true }),
		catImage: new FormControl('', { nonNullable: true }),
		titleTemplate: new FormControl('{{game}} · {{platform}}', { nonNullable: true }),
	});

	readonly modeValues: RouletteMode[] = ['classic', 'cat-bag', 'elimination'];
	readonly emulatorValues = ['all', 'yes', 'no'];
	readonly emulatorLabels = ['Не важно', 'Только с эмулятором', 'Без эмулятора'];
	readonly modeLabels = ['Classic', 'Кот в мешке', 'На выбывание'];
	readonly modeText = signal('Classic');
	readonly emulatorText = signal('Не важно');

	constructor() {
		this.roulette
			.config()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (config) => this.apply(config),
				error: () => this.apply(DEFAULT_ROULETTE_CONFIG),
			});
	}

	setMode(label: string): void {
		const index = this.modeLabels.indexOf(label);

		if (index < 0) {
			return;
		}

		this.modeText.set(label);
		this.form.controls.mode.setValue(this.modeValues[index]);
	}

	setEmulator(label: string): void {
		const index = this.emulatorLabels.indexOf(label);

		if (index < 0) {
			return;
		}

		this.emulatorText.set(label);
		this.form.controls.emulator.setValue(this.emulatorValues[index] as 'all' | 'yes' | 'no');
	}

	save(): void {
		this.error.set('');
		const value = this.form.getRawValue();
		const config: RouletteConfig = {
			...DEFAULT_ROULETTE_CONFIG,
			mode: value.mode,
			filters: {
				platforms: value.platforms.split(',').map((item) => item.trim()).filter(Boolean),
				tiers: ['gold', 'diamond', 'platinum', 'none'],
				ages: ['classic', 'retro', 'modern', 'new'],
				emulator: value.emulator === 'all' ? null : value.emulator === 'yes',
				yearFrom: 0,
				yearTo: 0,
			},
			weights: {
				tiers: {
					gold: value.tierGold,
					diamond: value.tierDiamond,
					platinum: value.tierPlatinum,
					none: value.tierNone,
				},
				platforms: {},
				games: {},
			},
			avoidRecent: value.avoidRecent,
			appearance: {
				background: value.background,
				accent: value.accent,
				text: value.text,
				fontFamily: value.fontFamily,
				fontUrl: value.fontUrl,
				scale: 1,
				memeUrl: value.memeUrl,
			},
			audio: {
				musicUrl: value.musicUrl,
				revealUrl: value.revealUrl,
				volume: value.volume,
			},
			reveal: {
				durationSeconds: value.durationSeconds,
				showCat: value.showCat,
				catImage: value.catImage,
				titleTemplate: value.titleTemplate,
			},
		};

		this.roulette
			.saveConfig(config)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.saved.set(true);
					timer(1500).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.saved.set(false));
				},
				error: (response) => this.error.set(response.error?.error ?? 'Не удалось сохранить'),
			});
	}

	private apply(config: RouletteConfig): void {
		this.modeText.set(this.modeLabels[this.modeValues.indexOf(config.mode)] ?? 'Classic');
		this.emulatorText.set(
			this.emulatorLabels[
				this.emulatorValues.indexOf(
					config.filters?.emulator === null ? 'all' : config.filters?.emulator ? 'yes' : 'no',
				)
			] ?? 'Не важно',
		);
		this.form.patchValue({
			mode: config.mode,
			platforms: (config.filters?.platforms ?? []).join(', '),
			emulator: config.filters?.emulator === null ? 'all' : config.filters?.emulator ? 'yes' : 'no',
			avoidRecent: config.avoidRecent ?? 10,
			tierGold: config.weights?.tiers?.['gold'] ?? 2,
			tierDiamond: config.weights?.tiers?.['diamond'] ?? 3,
			tierPlatinum: config.weights?.tiers?.['platinum'] ?? 5,
			tierNone: config.weights?.tiers?.['none'] ?? 1,
			background: config.appearance?.background ?? '#0F0817',
			accent: config.appearance?.accent ?? '#FF2EA6',
			text: config.appearance?.text ?? '#F5EAFF',
			fontFamily: config.appearance?.fontFamily ?? 'JetBrains Mono',
			fontUrl: config.appearance?.fontUrl ?? '',
			memeUrl: config.appearance?.memeUrl ?? '',
			musicUrl: config.audio?.musicUrl ?? '',
			revealUrl: config.audio?.revealUrl ?? '',
			volume: config.audio?.volume ?? 70,
			durationSeconds: config.reveal?.durationSeconds ?? 12,
			showCat: config.reveal?.showCat ?? true,
			catImage: config.reveal?.catImage ?? '',
			titleTemplate: config.reveal?.titleTemplate ?? '{{game}} · {{platform}}',
		}, { emitEvent: false });
	}
}
