import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { catchError, of, type Observable } from 'rxjs';
import {
	contrastRatio,
	isReadableAccent,
	mix,
	nearestReadable,
	parseHex,
} from '@shared/helpers/color';

type Theme = 'dark' | 'light' | 'system';
type Density = 'compact' | 'default';
type TextSize = 's' | 'm' | 'l';
export type SearchHotkey = 'both' | 'ctrl+f' | 'alt+k' | 'ctrl+k';

interface PersistedSettings {
	theme: Theme;
	density: Density;
	fontScale: number;
	reducedMotion: boolean;
	highContrast: boolean;
	textSize: TextSize;
	accent: string;
	searchHotkey: SearchHotkey;
	showSidebarHeader: boolean;
	sidebarCollapsed: boolean;
	backgroundImage: string;
	idleCat: boolean;
	idleCharacter: 'warrant' | 'cat' | 'custom';
	customCharacter: string;
}

const STORAGE_KEY = 'nsh.app-settings';

const DEFAULTS: PersistedSettings = {
	theme: 'dark',
	density: 'default',
	fontScale: 60,
	reducedMotion: false,
	highContrast: false,
	textSize: 'm',
	accent: '#FF2EA6',
	searchHotkey: 'both',
	showSidebarHeader: !(typeof navigator !== 'undefined' && navigator.userAgent.includes('NamelessStreamHataDesktop')),
	sidebarCollapsed: false,
	backgroundImage: '',
	idleCat: true,
	idleCharacter: 'warrant',
	customCharacter: '',
};

const ACCENT_BACKGROUND = '#0F0817';

const LIGHT_VARS: Record<string, string> = {
	'--tui-background-base': '#f7f3fb',
	'--tui-background-base-alt': '#efe7f7',
	'--tui-background-elevation-1': '#ffffff',
	'--tui-background-elevation-2': '#f1eaf8',
	'--tui-background-elevation-3': '#e5d9f2',
	'--tui-text-primary': '#24152f',
	'--tui-text-secondary': 'rgb(36, 21, 47, 0.72)',
	'--tui-text-tertiary': 'rgb(36, 21, 47, 0.5)',
	'--tui-border-normal': 'rgb(36, 21, 47, 0.18)',
	'--tui-border-hover': 'rgb(36, 21, 47, 0.32)',
	'--surface-base': '#f7f3fb',
	'--surface-elevated-1': '#ffffff',
	'--surface-elevated-2': '#f1eaf8',
	'--surface-elevated-3': '#e5d9f2',
	'--text-primary': '#24152f',
	'--text-secondary': 'rgb(36, 21, 47, 0.72)',
	'--text-tertiary': 'rgb(36, 21, 47, 0.5)',
	'--border-normal': 'rgb(36, 21, 47, 0.18)',
	'--border-strong': 'rgb(36, 21, 47, 0.28)',
	'--border-divider': 'rgb(36, 21, 47, 0.1)',
	'--neutral-1': 'rgb(36, 21, 47, 0.06)',
	'--neutral-2': 'rgb(36, 21, 47, 0.1)',
	'--skeleton': 'rgb(36, 21, 47, 0.08)',
	'--checker': 'rgb(36, 21, 47, 0.06)',
};

const COMPACT_VARS: Record<string, string> = {
	'--space-2xs': '2px',
	'--space-xs': '6px',
	'--space-sm': '8px',
	'--space-md': '12px',
	'--space-lg': '16px',
	'--space-xl': '20px',
	'--space-2xl': '24px',
	'--layout-header': '48px',
	'--layout-sidebar': '216px',
};

@Injectable({ providedIn: 'root' })
export class AppSettingsService {
	private readonly http = inject(HttpClient);
	readonly theme = signal<Theme>(DEFAULTS.theme);
	readonly density = signal<Density>(DEFAULTS.density);
	readonly fontScale = signal(DEFAULTS.fontScale);
	readonly reducedMotion = signal(DEFAULTS.reducedMotion);
	readonly highContrast = signal(DEFAULTS.highContrast);
	readonly textSize = signal<TextSize>(DEFAULTS.textSize);
	readonly accent = signal(DEFAULTS.accent);
	readonly searchHotkey = signal<SearchHotkey>(DEFAULTS.searchHotkey);
	readonly showSidebarHeader = signal(DEFAULTS.showSidebarHeader);
	readonly sidebarCollapsed = signal(DEFAULTS.sidebarCollapsed);
	readonly backgroundImage = signal(DEFAULTS.backgroundImage);
	readonly idleCat = signal(DEFAULTS.idleCat);
	readonly idleCharacter = signal(DEFAULTS.idleCharacter);
	readonly customCharacter = signal(DEFAULTS.customCharacter);
	readonly accentContrast = computed(() =>
		contrastRatio(this.accent(), ACCENT_BACKGROUND).toFixed(1),
	);

	readonly accentReadable = computed(() => isReadableAccent(this.accent(), ACCENT_BACKGROUND));

	constructor() {
		this.restore();

		window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
			if (this.theme() === 'system') {
				this.apply(this.snapshot());
			}
		});

		effect(() => {
			const settings = this.snapshot();

			this.apply(settings);
			this.persist(settings);
		});
	}

	private snapshot(): PersistedSettings {
		return {
			theme: this.theme(),
			density: this.density(),
			fontScale: this.fontScale(),
			reducedMotion: this.reducedMotion(),
			highContrast: this.highContrast(),
			textSize: this.textSize(),
			accent: this.accent(),
			searchHotkey: this.searchHotkey(),
			showSidebarHeader: this.showSidebarHeader(),
			sidebarCollapsed: this.sidebarCollapsed(),
			backgroundImage: this.backgroundImage(),
			idleCat: this.idleCat(),
			idleCharacter: this.idleCharacter(),
			customCharacter: this.customCharacter(),
		};
	}

	private apply(settings: PersistedSettings): void {
		if (typeof document === 'undefined') {
			return;
		}

		const root = document.documentElement;
		const textScale = settings.textSize === 's' ? 0.92 : settings.textSize === 'l' ? 1.12 : 1;
		const fontScale = 0.85 + (Math.min(100, Math.max(0, settings.fontScale)) / 100) * 0.4;

		const resolvedTheme =
			settings.theme === 'system'
				? window.matchMedia('(prefers-color-scheme: light)').matches
					? 'light'
					: 'dark'
				: settings.theme;

		root.dataset['theme'] = resolvedTheme;
		root.dataset['density'] = settings.density;
		root.dataset['textSize'] = settings.textSize;
		root.style.colorScheme = resolvedTheme;
		root.style.setProperty('--app-zoom', (textScale * fontScale).toFixed(3));
		root.style.setProperty(
			'--app-background-image',
			settings.backgroundImage ? `url("${settings.backgroundImage}")` : 'none',
		);
		root.classList.toggle('has-app-background', Boolean(settings.backgroundImage));
		this.applyAccent(root, settings.accent);
		this.applyAccent(document.body, settings.accent);
		this.applyThemeVars(root, resolvedTheme === 'light');
		this.applyDensityVars(root, settings.density === 'compact');

		const applyTuiRoot = (): void => {
			const tuiRoot = document.querySelector('tui-root') as HTMLElement | null;

			if (!tuiRoot) {
				return;
			}

			tuiRoot.setAttribute('tuiTheme', resolvedTheme);
			tuiRoot.style.colorScheme = resolvedTheme;
			this.applyAccent(tuiRoot, settings.accent);
			this.applyThemeVars(tuiRoot, resolvedTheme === 'light');
			this.applyDensityVars(tuiRoot, settings.density === 'compact');
		};

		applyTuiRoot();
		requestAnimationFrame(applyTuiRoot);
		root.classList.toggle('reduce-motion', settings.reducedMotion);
		root.classList.toggle('high-contrast', settings.highContrast);
	}

	saveNow(): Observable<unknown> {
		const settings = this.snapshot();

		this.apply(settings);
		this.persist(settings);

		return this.http
			.put('rgg-sync/app-settings', settings)
			.pipe(catchError(() => of(null)));
	}

	tryAccent(value: string): boolean {
		const normalized = value.trim().startsWith('#')
			? value.trim().toUpperCase()
			: `#${value.trim()}`.toUpperCase();

		if (!parseHex(normalized) || contrastRatio(normalized, ACCENT_BACKGROUND) < 3) {
			return false;
		}

		this.accent.set(normalized);

		return isReadableAccent(normalized, ACCENT_BACKGROUND);
	}

	applyNearestAccent(value: string): void {
		const nearest = nearestReadable(value, ACCENT_BACKGROUND);

		if (nearest) {
			this.accent.set(nearest);
		}
	}

	private applyThemeVars(element: HTMLElement, light: boolean): void {
		for (const [name, value] of Object.entries(LIGHT_VARS)) {
			if (light) {
				element.style.setProperty(name, value, 'important');
			} else {
				element.style.removeProperty(name);
			}
		}
	}

	private applyDensityVars(element: HTMLElement, compact: boolean): void {
		for (const [name, value] of Object.entries(COMPACT_VARS)) {
			if (compact) {
				element.style.setProperty(name, value, 'important');
			} else {
				element.style.removeProperty(name);
			}
		}
	}

	private applyAccent(root: HTMLElement, accent: string): void {
		root.style.setProperty('--accent-primary', accent, 'important');
		root.style.setProperty('--tui-background-accent-1', accent, 'important');
		root.style.setProperty('--tui-background-accent-1-hover', mix(accent, '#FFFFFF', 0.12), 'important');
		root.style.setProperty('--tui-background-accent-1-pressed', mix(accent, '#000000', 0.12), 'important');
		root.style.setProperty('--accent-primary-hover', mix(accent, '#FFFFFF', 0.12), 'important');
		root.style.setProperty('--accent-primary-pressed', mix(accent, '#000000', 0.12), 'important');
		const onAccent =
			contrastRatio(accent, '#0f0817') >= contrastRatio(accent, '#ffffff')
				? '#0f0817'
				: '#ffffff';

		const accentShadow = contrastRatio(accent, '#0f0817') < 3 ? 'rgb(255 255 255 / 45%)' : `${accent}66`;

		root.style.setProperty('--text-on-accent', onAccent, 'important');
		root.style.setProperty('--tui-text-primary-on-accent-1', onAccent, 'important');
		root.style.setProperty('--accent-shadow', `0 0 0 1px ${onAccent}55, 0 8px 28px ${accentShadow}`, 'important');
		root.style.setProperty('--tui-shadow-small', `0 4px 20px ${accentShadow}`, 'important');
		root.style.setProperty('--elevation-small', `0 4px 20px ${accentShadow}`, 'important');
		root.style.setProperty('--tui-text-action', accent, 'important');
		root.style.setProperty('--tui-text-action-hover', mix(accent, '#FFFFFF', 0.16), 'important');
		root.style.setProperty('--focus-border', mix(accent, '#FFFFFF', 0.25), 'important');
	}

	private restore(): void {
		if (typeof localStorage === 'undefined') {
			return;
		}

		try {
			const raw = localStorage.getItem(STORAGE_KEY);

			if (!raw) {
				return;
			}

			const parsed = JSON.parse(raw) as Partial<PersistedSettings>;

			this.theme.set(parsed.theme ?? DEFAULTS.theme);
			this.density.set(parsed.density ?? DEFAULTS.density);
			this.fontScale.set(parsed.fontScale ?? DEFAULTS.fontScale);
			this.reducedMotion.set(parsed.reducedMotion ?? DEFAULTS.reducedMotion);
			this.highContrast.set(parsed.highContrast ?? DEFAULTS.highContrast);
			this.textSize.set(parsed.textSize ?? DEFAULTS.textSize);
			this.accent.set(
				parsed.accent && isReadableAccent(parsed.accent, ACCENT_BACKGROUND)
					? parsed.accent
					: DEFAULTS.accent,
			);
			this.searchHotkey.set(parsed.searchHotkey ?? DEFAULTS.searchHotkey);
			this.showSidebarHeader.set(parsed.showSidebarHeader ?? DEFAULTS.showSidebarHeader);
			this.sidebarCollapsed.set(parsed.sidebarCollapsed ?? DEFAULTS.sidebarCollapsed);
			this.backgroundImage.set(parsed.backgroundImage ?? DEFAULTS.backgroundImage);
			this.idleCat.set(parsed.idleCat ?? DEFAULTS.idleCat);
			this.idleCharacter.set(parsed.idleCharacter ?? DEFAULTS.idleCharacter);
			this.customCharacter.set(parsed.customCharacter ?? DEFAULTS.customCharacter);
		} catch {
			// ignore broken storage
		}
	}

	private persist(settings: PersistedSettings): void {
		if (typeof localStorage === 'undefined') {
			return;
		}

		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	}
}
