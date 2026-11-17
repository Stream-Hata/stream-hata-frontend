import type { TuiLanguage } from '@taiga-ui/i18n';
import { computed, effect, Injectable, signal } from '@angular/core';
import { TUI_ENGLISH_LANGUAGE, TUI_RUSSIAN_LANGUAGE } from '@taiga-ui/i18n';
import { EN } from './i18n/en';
import { RU } from './i18n/ru';

export type AppLanguage = 'ru' | 'en';

const STORAGE_KEY = 'nsh.language';
const DICTIONARY = { ru: RU, en: EN } as const;

export type TranslationKey = keyof typeof RU;

@Injectable({ providedIn: 'root' })
export class I18nService {
	readonly language = signal<AppLanguage>(this.initialLanguage());

	readonly taigaLanguage = computed<TuiLanguage>(() =>
		this.language() === 'en' ? TUI_ENGLISH_LANGUAGE : TUI_RUSSIAN_LANGUAGE,
	);

	constructor() {
		effect(() => {
			const language = this.language();

			if (typeof document !== 'undefined') {
				document.documentElement.lang = language;
			}

			if (typeof localStorage !== 'undefined') {
				localStorage.setItem(STORAGE_KEY, language);
			}
		});
	}

	t(key: TranslationKey): string {
		return DICTIONARY[this.language()][key] ?? key;
	}

	setLanguage(language: string): void {
		this.language.set(language === 'en' ? 'en' : 'ru');
	}

	private initialLanguage(): AppLanguage {
		if (typeof localStorage === 'undefined') {
			return 'ru';
		}

		return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ru';
	}
}
