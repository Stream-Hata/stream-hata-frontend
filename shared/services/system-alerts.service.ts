import { inject, Injectable, NgZone } from '@angular/core';
import { SystemAlertSettingsService, type SystemAlertRule } from './system-alert-settings.service';
import { NotificationCenterService } from './notification-center.service';

interface Metrics {
	cpu_temperature: number | null;
	gpu_temperature: number | null;
	memory_total: number;
	memory_used: number;
	gpu_memory_total: number | null;
	gpu_memory_used: number | null;
	processes: number;
	disks: { total: number; available: number }[];
	batteries: { percent: number | null }[];
	sensors: { kind: string; value: number }[];
}

type Invoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

@Injectable({ providedIn: 'root' })
export class SystemAlertsService {
	private readonly settings = inject(SystemAlertSettingsService);
	private readonly center = inject(NotificationCenterService);
	private readonly zone = inject(NgZone);
	private readonly invoke = (
		window as unknown as { __TAURI_INTERNALS__?: { invoke?: Invoke } }
	).__TAURI_INTERNALS__?.invoke;
	private readonly active = new Set<string>();
	private timer: ReturnType<typeof setInterval> | null = null;
	private busy = false;

	constructor() {
		if (!this.invoke) {
			return;
		}
		void this.tick();
		this.timer = setInterval(() => void this.tick(), 8000);
	}

	async testNotification(): Promise<boolean> {
		if (!this.invoke) {
			return false;
		}
		await this.invoke('system_alert', {
			title: 'StreamHata · Проверка связи',
			body: 'Диспетчерская: канал системных уведомлений открыт. Турбины работают в штатном режиме.',
		});

		return true;
	}

	private async tick(): Promise<void> {
		if (this.busy || !this.settings.enabled()) {
			this.active.clear();

			return;
		}
		this.busy = true;
		try {
			const metrics = (await this.invoke?.('system_metrics')) as Metrics | undefined;

			if (metrics) {
				this.evaluate(metrics);
			}
		} catch {
			// monitoring is best effort
		} finally {
			this.busy = false;
		}
	}

	private evaluate(metrics: Metrics): void {
		const fan = Math.max(0, ...metrics.sensors.filter((sensor) => sensor.kind === 'fan').map((sensor) => sensor.value));
		const voltage = Math.max(0, ...metrics.sensors.filter((sensor) => sensor.kind === 'voltage').map((sensor) => sensor.value));
		const disk = Math.max(0, ...metrics.disks.map((item) => (item.total ? ((item.total - item.available) / item.total) * 100 : 0)));
		const ram = metrics.memory_total ? (metrics.memory_used / metrics.memory_total) * 100 : 0;
		const vram = metrics.gpu_memory_total ? ((metrics.gpu_memory_used ?? 0) / metrics.gpu_memory_total) * 100 : 0;
		const battery = Math.min(100, ...metrics.batteries.map((item) => item.percent ?? 100));
		const values: Record<string, number | null> = {
			cpuTemp: metrics.cpu_temperature,
			gpuTemp: metrics.gpu_temperature,
			fan,
			ram,
			vram,
			disk,
			battery,
			voltage,
			processes: metrics.processes,
		};

		for (const rule of this.settings.rules()) {
			const value = values[rule.id];
			const bad = rule.enabled && value != null && (rule.compare === 'gte' ? value >= rule.threshold : value <= rule.threshold);

			if (!bad) {
				this.active.delete(rule.id);
				continue;
			}
			if (this.active.has(rule.id)) {
				continue;
			}
			this.active.add(rule.id);
			this.notify(rule, value);
		}
	}

	private notify(rule: SystemAlertRule, value: number): void {
		const body = rule.message
			.replaceAll('{value}', `${value.toFixed(rule.unit === 'RPM' || rule.unit === 'шт.' ? 0 : 1)} ${rule.unit}`.trim())
			.replaceAll('{threshold}', `${rule.threshold} ${rule.unit}`.trim());

		this.center.add(`Системное событие · ${rule.label}`, body, 'monitor');
		this.zone.run(() => {
			void this.invoke?.('system_alert', {
				title: `StreamHata · ${rule.label}`,
				body,
			});
		});
	}
}
