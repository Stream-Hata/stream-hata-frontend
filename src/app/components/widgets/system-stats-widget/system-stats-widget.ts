import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { I18nService } from '@shared/services/i18n.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, startWith, switchMap } from 'rxjs';

interface DiskMetric {
	name: string;
	mount: string;
	total: number;
	available: number;
}

interface SystemMetrics {
	cpu: number;
	gpu: number | null;
	memory_total: number;
	memory_used: number;
	swap_total: number;
	swap_used: number;
	uptime: number;
	processes: number;
	network_received: number;
	network_transmitted: number;
	disks: DiskMetric[];
}

interface NetworkRate {
	down: number;
	up: number;
}

@Component({
	selector: 'app-system-stats-widget',
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (metrics(); as data) {
			<div class="system-widget">
				<div class="system-row">
					<span class="system-label">{{ i18n.t('system.cpu') }}</span>
					<span class="system-value">{{ data.cpu.toFixed(0) }}%</span>
				</div>
				<div class="system-bar"><span [style.width.%]="clamp(data.cpu)"></span></div>

				@if (data.gpu !== null) {
					<div class="system-row">
						<span class="system-label">{{ i18n.t('system.gpu') }}</span>
						<span class="system-value">{{ data.gpu.toFixed(0) }}%</span>
					</div>
					<div class="system-bar"><span [style.width.%]="clamp(data.gpu)"></span></div>
				}

				<div class="system-row">
					<span class="system-label">{{ i18n.t('system.memory') }}</span>
					<span class="system-value">{{ formatBytes(data.memory_used) }} / {{ formatBytes(data.memory_total) }}</span>
				</div>
				<div class="system-bar"><span [style.width.%]="memoryPercent(data)"></span></div>

				<div class="system-row">
					<span class="system-label">{{ i18n.t('system.network') }}</span>
					<span class="system-value">{{ formatBytes(network().down) }}/s ↓ · {{ formatBytes(network().up) }}/s ↑</span>
				</div>

				<div class="system-row system-muted">
					<span>{{ data.processes }} {{ i18n.t('system.processes') }}</span>
					<span>{{ i18n.t('system.uptime') }} {{ formatUptime(data.uptime) }}</span>
				</div>

				@for (disk of data.disks; track disk.mount) {
					<div class="system-disk">
						<span>{{ disk.mount }}</span>
						<span>{{ formatBytes(disk.total - disk.available) }} / {{ formatBytes(disk.total) }}</span>
					</div>
				}
			</div>
		} @else {
			<div class="system-empty">{{ i18n.t('system.unavailable') }}</div>
		}
	`,
	styles: `
		:host {
			display: block;
			width: 100%;
			max-width: 360px;
		}

		.system-widget {
			display: flex;
			gap: 8px;
			flex-direction: column;
			font: var(--tui-font-text-s);
		}

		.system-row {
			display: flex;
			justify-content: space-between;
			gap: 12px;
			align-items: baseline;
		}

		.system-label {
			color: var(--tui-text-secondary);
			font-size: 11px;
			letter-spacing: 0.08em;
			text-transform: uppercase;
		}

		.system-value {
			font-weight: 700;
			font-variant-numeric: tabular-nums;
		}

		.system-bar {
			height: 7px;
			overflow: hidden;
			border-radius: 99px;
			background: var(--tui-background-neutral-2);
		}

		.system-bar span {
			display: block;
			height: 100%;
			border-radius: inherit;
			background: linear-gradient(90deg, var(--tui-background-accent-1), var(--tui-background-accent-2));
			transition: width 0.25s ease;
		}

		.system-muted,
		.system-disk {
			color: var(--tui-text-secondary);
			font-size: 11px;
		}

		.system-disk {
			display: flex;
			justify-content: space-between;
			gap: 12px;
			padding-top: 2px;
			border-top: 1px solid var(--tui-border-normal);
		}

		.system-empty {
			color: var(--tui-text-secondary);
			text-align: center;
		}
	`,
})
export class SystemStatsWidget {
	private readonly destroyRef = inject(DestroyRef);
	readonly i18n = inject(I18nService);

	readonly metrics = signal<SystemMetrics | null>(null);
	readonly network = signal<NetworkRate>({ down: 0, up: 0 });

	private previous: SystemMetrics | null = null;
	private previousAt = 0;

	constructor() {
		interval(2000)
			.pipe(
				startWith(0),
				switchMap(() => this.readMetrics()),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((data) => this.apply(data));
	}

	clamp(value: number): number {
		return Math.max(0, Math.min(100, value));
	}

	memoryPercent(data: SystemMetrics): number {
		return data.memory_total ? this.clamp((data.memory_used / data.memory_total) * 100) : 0;
	}

	formatBytes(value: number): string {
		if (!value) {
			return '0 B';
		}

		const units = ['B', 'KB', 'MB', 'GB', 'TB'];
		const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));

		return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
	}

	formatUptime(seconds: number): string {
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);

		return `${days ? `${days} д ` : ''}${hours} ч`;
	}

	private async readMetrics(): Promise<SystemMetrics | null> {
		const internals = (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] as
			| { invoke?: (command: string) => Promise<unknown> }
			| undefined;
		const globalTauri = (window as unknown as Record<string, unknown>)['__TAURI__'] as
			| { core?: { invoke?: (command: string) => Promise<unknown> } }
			| undefined;
		const invoke = internals?.invoke ?? globalTauri?.core?.invoke;

		if (!invoke) {
			return null;
		}

		try {
			return (await invoke('system_metrics')) as SystemMetrics;
		} catch {
			return null;
		}
	}

	private apply(data: SystemMetrics | null): void {
		if (!data) {
			return;
		}

		const now = Date.now();

		if (this.previous) {
			const seconds = Math.max(0.5, (now - this.previousAt) / 1000);

			this.network.set({
				down: Math.max(0, (data.network_received - this.previous.network_received) / seconds),
				up: Math.max(0, (data.network_transmitted - this.previous.network_transmitted) / seconds),
			});
		}

		this.previous = data;
		this.previousAt = now;
		this.metrics.set(data);
	}
}
