import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiButton, TuiDropdown, TuiInput, TuiLink, TuiSelectLike, TuiTextfield } from '@taiga-ui/core';
import { I18nService, type TranslationKey } from '@shared/services/i18n.service';
import { TuiButtonCopy, TuiChevron, TuiDataListWrapper, TuiSwitch } from '@taiga-ui/kit';
import {
	loadSystemWidgetConfig,
	saveSystemWidgetConfig,
	type SystemWidgetConfig,
	systemWidgetUrl,
} from '../../widgets/system-stats-widget/system-widget-config';

@Component({
	selector: 'app-system-widget-config-page',
	changeDetection: ChangeDetectionStrategy.OnPush,
	imports: [
		RouterLink,
		TuiButton,
		TuiButtonCopy,
		TuiChevron,
		TuiDataListWrapper,
		TuiDropdown,
		TuiInput,
		TuiLink,
		TuiSelectLike,
		TuiSwitch,
		TuiTextfield,
	],
	template: `
		<div class="jk-page">
			<header class="jk-page-header">
				<div class="jk-page-header-text">
					<h1 class="jk-h1">{{ i18n.t('system.title') }}</h1>
					<p class="jk-caption">{{ i18n.t('system.configSubtitle') }}</p>
				</div>
				<a routerLink="/app/widgets" tuiLink>{{ i18n.t('system.backToWidgets') }}</a>
			</header>

			<section class="config-card">
				@for (row of rows; track row.key) {
					<label class="config-row">
						<span>{{ i18n.t(row.labelKey) }}</span>
						<input
							type="checkbox"
							[checked]="config()[row.key]"
							(change)="set(row.key, $any($event.target).checked)"
							tuiSwitch
						/>
					</label>
				}

				<div class="config-row">
					<span>{{ i18n.t('system.refresh') }}</span>
					<tui-textfield tuiChevron>
						<input [readonly]="true" [value]="intervalLabel()" tuiInput tuiSelectLike />
						<tui-data-list-wrapper
							*tuiDropdown
							[items]="intervalLabels()"
							(itemClick)="setIntervalLabel($event)"
						/>
					</tui-textfield>
				</div>

				<div class="config-actions">
					<button appearance="primary" size="m" tuiButton type="button" (click)="save()">
						{{ i18n.t('system.save') }}
					</button>
					<button
						appearance="flat"
						size="m"
						[tuiButtonCopy]="url()"
						tuiButton
						type="button"
					>
						{{ i18n.t('system.copyObs') }}
					</button>
				</div>
			</section>
		</div>
	`,
	styles: `
		.config-card {
			display: flex;
			gap: 12px;
			flex-direction: column;
			max-width: 560px;
			padding: 20px;
			border: 1px solid var(--border-normal);
			border-radius: var(--radius-lg);
			background: var(--surface-elevated-1);
		}

		.config-row {
			display: flex;
			justify-content: space-between;
			gap: 16px;
			align-items: center;
		}

		.config-actions {
			display: flex;
			gap: 12px;
			flex-wrap: wrap;
			padding-top: 8px;
		}

		tui-textfield {
			min-width: 180px;
		}
	`,
})
export default class SystemWidgetConfigPage {
	readonly i18n = inject(I18nService);
	readonly rows: { key: 'cpu' | 'gpu' | 'memory' | 'network' | 'processes' | 'disks'; labelKey: TranslationKey }[] = [
		{ key: 'cpu', labelKey: 'system.showCpu' },
		{ key: 'gpu', labelKey: 'system.showGpu' },
		{ key: 'memory', labelKey: 'system.showMemory' },
		{ key: 'network', labelKey: 'system.showNetwork' },
		{ key: 'processes', labelKey: 'system.showProcesses' },
		{ key: 'disks', labelKey: 'system.showDisks' },
	] as const;

	readonly intervalKeys: TranslationKey[] = ['system.refresh1', 'system.refresh2', 'system.refresh5'];
	readonly config = signal<SystemWidgetConfig>(loadSystemWidgetConfig());
	readonly url = signal(systemWidgetUrl(this.config()));
	intervalLabels(): string[] {
		return this.intervalKeys.map((key) => this.i18n.t(key));
	}

	intervalLabel(): string {
		return this.intervalLabels()[Math.max(0, [1, 2, 5].indexOf(this.config().interval))] ?? this.i18n.t('system.refresh2');
	}

	set(key: 'cpu' | 'gpu' | 'memory' | 'network' | 'processes' | 'disks', value: boolean): void {
		this.config.update((config) => ({ ...config, [key]: value }));
		this.url.set(systemWidgetUrl(this.config()));
	}

	setIntervalLabel(label: string): void {
		const interval = [1, 2, 5][this.intervalLabels().indexOf(label)] ?? 2;
		this.config.update((config) => ({ ...config, interval }));
		this.url.set(systemWidgetUrl(this.config()));
	}

	save(): void {
		saveSystemWidgetConfig(this.config());
		this.url.set(systemWidgetUrl(this.config()));
	}
}
