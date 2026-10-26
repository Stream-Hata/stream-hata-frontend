import { Component, computed, inject, Injector, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { signalControl } from '@shared/helpers/form-control';
import {
	TuiButton,
	TuiDropdown,
	TuiIcon,
	TuiInput,
	TuiSelectLike,
	tuiItemsHandlersProvider,
	TuiSlider,
	TuiTextfield,
} from '@taiga-ui/core';
import {
	TuiDataListWrapper,
	TuiSegmented,
	TuiSwitch,
	TuiTabs,
	TuiTextarea,
} from '@taiga-ui/kit';

type Section = 'main' | 'appearance' | 'access';

const SELECT_LABELS: Record<string, string> = {
	15: '15 секунд',
	30: '30 секунд',
	60: '60 секунд',
	120: '2 минуты',
	standard: 'Standard',
	compact: 'Compact',
	minimal: 'Minimal',
};

@Component({
	imports: [
		ReactiveFormsModule,
		RouterLink,
		TuiButton,
		TuiDataListWrapper,
		TuiDropdown,
		TuiIcon,
		TuiInput,
		TuiSegmented,
		TuiSlider,
		TuiSwitch,
		TuiTabs,
		TuiTextarea,
		TuiTextfield,
	],
	providers: [
		tuiItemsHandlersProvider({
			stringify: signal((value: string) => SELECT_LABELS[value] ?? value),
		}),
	],
	selector: 'app-chat-jury-settings-page',
	styleUrl: './chat-jury-settings-page.scss',
	templateUrl: './chat-jury-settings-page.html',
})
export default class ChatJurySettingsPage {
	private readonly injector = inject(Injector);
	readonly section = signal<Section>('main');

	readonly sections = [
		{ id: 'main' as const, label: 'Основное', icon: '@tui.sliders-horizontal' },
		{ id: 'appearance' as const, label: 'Появление', icon: '@tui.palette' },
		{ id: 'access' as const, label: 'Доступ', icon: '@tui.shield' },
	];

	readonly activeIndex = computed(() =>
		Math.max(
			0,
			this.sections.findIndex((item) => item.id === this.section()),
		),
	);

	/* Основное */
	readonly templates = signal('Спрятаться или сражаться?\nЗаберитесь за бочку\nИдём на босса');
	readonly duration = signal('30');
	readonly durationControl = signalControl(this.duration, this.injector);
	readonly durationValues = ['15', '30', '60', '120'];
	readonly durationLabels = ['15 секунд', '30 секунд', '60 секунд', '2 минуты'];
	readonly quorum = signal(10);
	readonly autoOpen = signal(true);
	readonly autoOpenControl = signalControl(this.autoOpen, this.injector);

	/* Появление */
	readonly style = signal('standard');
	readonly styleControl = signalControl(this.style, this.injector);
	readonly styleValues = ['standard', 'compact', 'minimal'];
	readonly styleLabels = ['Standard', 'Compact', 'Minimal'];
	readonly theme = signal<'dark' | 'light' | 'auto'>('dark');
	readonly themeIndex = computed(() => ['dark', 'light', 'auto'].indexOf(this.theme()));
	readonly showAuthors = signal(true);
	readonly showAuthorsControl = signalControl(this.showAuthors, this.injector);
	readonly showProgress = signal(true);
	readonly showProgressControl = signalControl(this.showProgress, this.injector);
	readonly animation = signal(true);
	readonly animationControl = signalControl(this.animation, this.injector);

	/* Доступ */
	readonly voteCommand = signal('!голос');
	readonly startCommand = signal('!жюри');

	setTheme(index: number): void {
		this.theme.set((['dark', 'light', 'auto'] as const)[index] ?? 'dark');
	}

	selectSection(index: number): void {
		this.section.set(this.sections[index]?.id ?? 'main');
	}
}
