import type { OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	inject,
	NgZone,
	signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormatBytesPipe } from '@shared/pipes/format-bytes.pipe';
import { FormatDurationPipe } from '@shared/pipes/format-duration.pipe';
import { FormatPercentPipe } from '@shared/pipes/format-percent.pipe';
import { FormatUptimePipe } from '@shared/pipes/format-uptime.pipe';
import { TwitchService } from '@shared/services/twitch.service';
import {
	TuiAxes,
	TuiBarChart,
	TuiLineChartHint,
	TuiLineChart,
	TuiRingChart,
} from '@taiga-ui/addon-charts';
import {
	TuiTable,
	TuiTableTbody,
	TuiTableTd,
	TuiTableTh,
	TuiTableThead,
} from '@taiga-ui/addon-table';
import { TuiButton, TuiIcon, TuiSelectLike, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiDataListWrapper } from '@taiga-ui/kit';

interface CpuCore {
	name: string;
	usage: number;
	frequency: number;
}

interface ProcessMetric {
	pid: number;
	name: string;
	cpu: number;
	memory: number;
	status: string;
	exe: string;
	cmd: string;
	user: string;
}

interface NetworkMetric {
	name: string;
	received: number;
	transmitted: number;
	packets_received: number;
	packets_transmitted: number;
	errors_received: number;
	errors_transmitted: number;
	kind: string;
	ssid: string | null;
	signal: number | null;
	bitrate: number | null;
	link_speed: number | null;
}

interface DiskMetric {
	name: string;
	mount: string;
	total: number;
	available: number;
	kind: string;
	file_system: string;
	removable: boolean;
	read_bytes: number;
	written_bytes: number;
}

interface BatteryMetric {
	name: string;
	status: string;
	percent: number | null;
}

interface PeripheralMetric {
	name: string;
	kind: string;
	detail: string;
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
	host: string;
	os: string;
	kernel: string;
	physical_cores: number;
	logical_cores: number;
	load_one: number;
	load_five: number;
	load_fifteen: number;
	cpu_cores: CpuCore[];
	process_list: ProcessMetric[];
	networks: NetworkMetric[];
	batteries: BatteryMetric[];
	peripherals: PeripheralMetric[];
	arch: string;
	bitness: number;
	cpu_brand: string;
	cpu_vendor: string;
	cpu_frequency: number;
	gpu_name: string;
	gpu_temperature: number | null;
	gpu_memory_total: number | null;
	gpu_memory_used: number | null;
	cpu_temperature: number | null;
	sensors: SensorMetric[];
}

interface SensorMetric {
	name: string;
	kind: string;
	value: number;
	unit: string;
}

type PeriodKey = 'before' | 'live' | 'after';
type RecordMode = 'auto' | PeriodKey;
type ChartKey = 'load' | 'network' | 'disk' | 'loadproc' | 'cores';

interface PeriodAggregate {
	samples: number;
	cpuSum: number;
	cpuMax: number;
	gpuSum: number;
	gpuMax: number;
	ramSum: number;
	ramMax: number;
	vramSum: number;
	vramMax: number;
	netDownSum: number;
	netDownMax: number;
	netUpSum: number;
	netUpMax: number;
	diskReadMax: number;
	diskWriteMax: number;
	processesSum: number;
	processesMax: number;
	cpuTempMax: number | null;
	gpuTempMax: number | null;
	lastAt: number;
}

interface MemoryModule {
	locator: string;
	bank: string;
	size: string;
	kind: string;
	speed: string;
	manufacturer: string;
	part_number: string;
}

interface VolumeMetric {
	name: string;
	path: string;
	kind: string;
	size: number;
	file_system: string;
	mount: string;
	model: string;
	serial: string;
	parent: string;
	transport: string;
	rotational: boolean;
	revision: string;
}

interface SmartAttribute {
	id: number;
	name: string;
	value: number;
	worst: number;
	threshold: number;
	raw: string;
}

interface DiskHealth {
	device: string;
	model: string;
	serial: string;
	firmware: string;
	health: string;
	temperature_c: number | null;
	power_on_hours: number | null;
	reallocated_sectors: number | null;
	pending_sectors: number | null;
	uncorrectable_sectors: number | null;
	wear_percent: number | null;
	data_written_bytes: number | null;
	data_read_bytes: number | null;
	media_errors: number | null;
	note: string;
	transport: string;
	rotational: boolean;
	type_label: string;
	attributes: SmartAttribute[];
}

interface SystemDetails {
	memory: MemoryModule[];
	volumes: VolumeMetric[];
	disks: DiskHealth[];
	board_vendor: string;
	board_name: string;
	bios_vendor: string;
	bios_version: string;
	bios_date: string;
	product_name: string;
	serial: string;
}

interface History {
	cpu: number[];
	gpu: number[];
	memory: number[];
	networkDown: number[];
	networkUp: number[];
	diskRead: number[];
	diskWrite: number[];
	load: number[];
	processes: number[];
	vram: number[];
	cores: number[][];
}

interface CompareRow {
	label: string;
	unit: string;
	before: string;
	live: string;
	after: string;
}

type Invoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

const EMPTY_HISTORY: History = {
	cpu: [],
	gpu: [],
	memory: [],
	networkDown: [],
	networkUp: [],
	diskRead: [],
	diskWrite: [],
	load: [],
	processes: [],
	vram: [],
	cores: [],
};

function emptyPeriod(): PeriodAggregate {
	return {
		samples: 0,
		cpuSum: 0,
		cpuMax: 0,
		gpuSum: 0,
		gpuMax: 0,
		ramSum: 0,
		ramMax: 0,
		vramSum: 0,
		vramMax: 0,
		netDownSum: 0,
		netDownMax: 0,
		netUpSum: 0,
		netUpMax: 0,
		diskReadMax: 0,
		diskWriteMax: 0,
		processesSum: 0,
		processesMax: 0,
		cpuTempMax: null,
		gpuTempMax: null,
		lastAt: 0,
	};
}

function emptyPeriods(): Record<PeriodKey, PeriodAggregate> {
	return { before: emptyPeriod(), live: emptyPeriod(), after: emptyPeriod() };
}

@Component({
	imports: [
		DatePipe,
		FormatBytesPipe,
		FormatDurationPipe,
		FormatPercentPipe,
		FormatUptimePipe,
		TuiAxes,
		TuiBarChart,
		TuiButton,
		TuiChevron,
		TuiDataListWrapper,
		TuiIcon,
		TuiLineChart,
		TuiLineChartHint,
		TuiRingChart,
		TuiSelectLike,
		TuiTable,
		TuiTableTbody,
		TuiTableTd,
		TuiTableTh,
		TuiTableThead,
		TuiTextfield,
	],
	selector: 'app-system-page',
	styleUrl: './system-page.scss',
	templateUrl: './system-page.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SystemPage implements OnDestroy {
	private readonly destroyRef = inject(DestroyRef);
	private readonly zone = inject(NgZone);
	private readonly internals = (window as unknown as { __TAURI_INTERNALS__?: { invoke?: Invoke } })
		.__TAURI_INTERNALS__;

	private readonly twitch = inject(TwitchService);
	private metricsTimer: ReturnType<typeof setInterval> | null = null;
	private detailsTimer: ReturnType<typeof setInterval> | null = null;
	private twitchTimer: ReturnType<typeof setInterval> | null = null;
	private previous: SystemMetrics | null = null;
	private previousAt = 0;
	private lastLiveAt = 0;
	private metricsBusy = false;
	private detailsBusy = false;
	private pageVisible = !document.hidden;
	private readonly storageKey = 'streamhata.system.periods.v1';

	readonly metrics = signal<SystemMetrics | null>(null);
	readonly details = signal<SystemDetails | null>(null);
	readonly history = signal<History>(EMPTY_HISTORY);
	readonly loading = signal(true);
	readonly detailsLoading = signal(true);
	readonly error = signal('');
	readonly showWarning = signal(false);
	readonly updatedAt = signal<Date | null>(null);
	readonly killingPid = signal<number | null>(null);
	readonly pendingKillPid = signal<number | null>(null);
	readonly actionError = signal('');
	readonly peaksOnly = signal(false);
	readonly chartZooms = signal<Record<ChartKey, number>>({
		load: 1,
		network: 1,
		disk: 1,
		loadproc: 1,
		cores: 1,
	});
	readonly streamOnline = signal(false);
	readonly recordMode = signal<RecordMode>('auto');
	readonly periods = signal<Record<PeriodKey, PeriodAggregate>>(this.loadPeriods());
	readonly recordModeOptions = ['Авто', 'До стрима', 'Во время', 'После'];
	readonly comparePeriods: { key: PeriodKey; label: string }[] = [
		{ key: 'before', label: 'До стрима' },
		{ key: 'live', label: 'Во время' },
		{ key: 'after', label: 'После' },
	];

	readonly recordModeLabel = computed(
		() =>
			this.recordModeOptions[['auto', 'before', 'live', 'after'].indexOf(this.recordMode())] ??
			'Авто',
	);


	readonly axisYLabels = ['100', '75', '50', '25', '0'];
	readonly chartX = 0;
	readonly chartY = 0;
	readonly chartWidth = 600;
	readonly chartHeight = 165;

	readonly cpuChart = computed(() => this.points(this.history().cpu, 'load'));
	readonly gpuChart = computed(() => this.points(this.history().gpu, 'load'));
	readonly memoryChart = computed(() => this.points(this.history().memory, 'load'));
	readonly networkChart = computed(() => this.points(this.history().networkDown, 'network'));
	readonly networkUpChart = computed(() => this.points(this.history().networkUp, 'network'));
	readonly diskReadChart = computed(() => this.points(this.history().diskRead, 'disk'));
	readonly diskWriteChart = computed(() => this.points(this.history().diskWrite, 'disk'));
	readonly loadChart = computed(() => this.points(this.history().load, 'loadproc'));
	readonly processChart = computed(() => this.points(this.history().processes, 'loadproc'));
	readonly vramChart = computed(() => this.points(this.history().vram, 'load'));
	readonly coreCharts = computed(() =>
		this.history().cores.map((series) => this.points(series, 'cores')),
	);
	readonly ramPercent = computed(() => {
		const data = this.metrics();

		return data?.memory_total ? (data.memory_used / data.memory_total) * 100 : 0;
	});

	readonly vramPercent = computed(() => {
		const data = this.metrics();

		return data?.gpu_memory_total
			? ((data.gpu_memory_used ?? 0) / data.gpu_memory_total) * 100
			: 0;
	});

	readonly ramRing = computed(() => {
		const data = this.metrics();

		return data ? [data.memory_used, Math.max(0, data.memory_total - data.memory_used)] : [0, 1];
	});

	readonly swapRing = computed(() => {
		const data = this.metrics();

		return data ? [data.swap_used, Math.max(0, data.swap_total - data.swap_used)] : [0, 1];
	});

	readonly diskRings = computed(() =>
		(this.metrics()?.disks ?? []).map((disk) => ({
			disk,
			value: [disk.total - disk.available, disk.available],
		})),
	);

	readonly cpuRing = computed(() => {
		const data = this.metrics();
		const value = data?.cpu ?? 0;

		return [value, Math.max(0, 100 - value)];
	});

	readonly gpuRing = computed(() => {
		const data = this.metrics();
		const value = data?.gpu ?? 0;

		return [value, Math.max(0, 100 - value)];
	});

	readonly vramRing = computed(() => {
		const data = this.metrics();
		const total = data?.gpu_memory_total ?? 0;
		const used = data?.gpu_memory_used ?? 0;

		return total ? [used, Math.max(0, total - used)] : [0, 1];
	});

	readonly coreBars = computed(() =>
		(this.metrics()?.cpu_cores ?? []).map((core) => [Math.max(0, Math.min(100, core.usage))]),
	);

	readonly processCpuBars = computed(() =>
		(this.metrics()?.process_list ?? []).slice(0, 12).map((process) => [Math.max(0, process.cpu)]),
	);

	readonly processMemoryBars = computed(() =>
		(this.metrics()?.process_list ?? [])
			.slice(0, 12)
			.map((process) => [process.memory / 1024 / 1024]),
	);

	readonly diskBars = computed(() =>
		(this.metrics()?.disks ?? []).map((disk) => [
			disk.total ? ((disk.total - disk.available) / disk.total) * 100 : 0,
		]),
	);

	readonly diskPie = computed(() => {
		const values = (this.metrics()?.disks ?? []).map((disk) => disk.total - disk.available);

		return values.length ? values : [1];
	});

	readonly compareRows = computed<CompareRow[]>(() => {
		const periods = this.periods();
		const row = (
			label: string,
			unit: string,
			read: (value: PeriodAggregate) => string,
		): CompareRow => ({
			label,
			unit,
			before: read(periods.before),
			live: read(periods.live),
			after: read(periods.after),
		});
		const avgMax = (sum: number, max: number, samples: number, unit: string, digits = 1): string =>
			samples ? `${(sum / samples).toFixed(digits)} / ${max.toFixed(digits)}${unit}` : '—';
		const maxOnly = (max: number, samples: number, unit: string): string =>
			samples ? max.toFixed(1) + unit : '—';
		const temp = (value: number | null): string =>
			value == null ? '—' : `${value.toFixed(0)}°C`;

		return [
			row('CPU', '%', (value) => avgMax(value.cpuSum, value.cpuMax, value.samples, '%')),
			row('GPU', '%', (value) => avgMax(value.gpuSum, value.gpuMax, value.samples, '%')),
			row('RAM', '%', (value) => avgMax(value.ramSum, value.ramMax, value.samples, '%')),
			row('VRAM', '%', (value) => avgMax(value.vramSum, value.vramMax, value.samples, '%')),
			row('Сеть ↓', 'MB/s', (value) =>
				avgMax(value.netDownSum, value.netDownMax, value.samples, ' MB/s')),
			row('Сеть ↑', 'MB/s', (value) =>
				avgMax(value.netUpSum, value.netUpMax, value.samples, ' MB/s')),
			row('Диск чтение', 'MB/s', (value) => maxOnly(value.diskReadMax, value.samples, ' MB/s')),
			row('Диск запись', 'MB/s', (value) => maxOnly(value.diskWriteMax, value.samples, ' MB/s')),
			row('Процессы', '', (value) =>
				avgMax(value.processesSum, value.processesMax, value.samples, '', 0)),
			row('CPU temp', '°C', (value) => temp(value.cpuTempMax)),
			row('GPU temp', '°C', (value) => temp(value.gpuTempMax)),
		];
	});

	readonly healthByDevice = computed(() => {
		const map = new Map<string, DiskHealth>();

		for (const disk of this.details()?.disks ?? []) {
			map.set(disk.device, disk);
		}

		return map;
	});

	readonly hardware = computed(() => {
		const details = this.details();

		if (!details) {
			return [];
		}

		return [
			{
				label: 'Плата',
				value: [details.board_vendor, details.board_name].filter(Boolean).join(' · '),
			},
			{
				label: 'BIOS',
				value: [details.bios_vendor, details.bios_version, details.bios_date]
					.filter(Boolean)
					.join(' · '),
			},
			{
				label: 'Устройство',
				value: [details.product_name, details.serial].filter(Boolean).join(' · '),
			},
		];
	});

	constructor() {
		try {
			this.showWarning.set(localStorage.getItem('nsh.system-warning-seen') !== '1');
		} catch {
			this.showWarning.set(true);
		}

		if (!this.internals?.invoke) {
			this.loading.set(false);
			this.detailsLoading.set(false);
			this.error.set('Мониторинг доступен только в desktop-приложении.');

			return;
		}

		this.startTimers();
		void this.refreshStreamStatus();
		this.twitchTimer = setInterval(() => void this.refreshStreamStatus(), 30000);
		const onVisibility = (): void => {
			this.pageVisible = !document.hidden;
			if (this.pageVisible) {
				this.startTimers();
			} else {
				this.stopTimers();
			}
		};
		document.addEventListener('visibilitychange', onVisibility);
		this.destroyRef.onDestroy(() => {
			document.removeEventListener('visibilitychange', onVisibility);
			this.stop();
		});
	}

	ngOnDestroy(): void {
		this.stop();
	}

	onChartWheel(event: WheelEvent, key: ChartKey): void {
		event.preventDefault();
		event.stopPropagation();
		const factor = event.deltaY < 0 ? 2 : 0.5;

		this.chartZooms.update((value) => ({
			...value,
			[key]: Math.min(8, Math.max(1, value[key] * factor)),
		}));
	}

	dismissWarning(): void {
		this.showWarning.set(false);
		try {
			localStorage.setItem('nsh.system-warning-seen', '1');
		} catch {
			// storage unavailable
		}
	}

	refresh(): void {
		void this.loadMetrics();
		void this.loadDetails();
	}

	private startTimers(): void {
		this.stopTimers();
		void this.loadMetrics();
		this.metricsTimer = setInterval(() => void this.loadMetrics(), 2000);
		this.detailsTimer = setInterval(() => void this.loadDetails(), 30000);
		setTimeout(() => void this.loadDetails(), 1200);
	}

	private stopTimers(): void {
		if (this.metricsTimer) {
			clearInterval(this.metricsTimer);
			this.metricsTimer = null;
		}
		if (this.detailsTimer) {
			clearInterval(this.detailsTimer);
			this.detailsTimer = null;
		}
	}

	private stop(): void {
		this.stopTimers();
		if (this.twitchTimer) {
			clearInterval(this.twitchTimer);
			this.twitchTimer = null;
		}
	}

	private invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
		const invoke = this.internals?.invoke;

		if (!invoke) {
			return Promise.reject(new Error('Tauri invoke unavailable'));
		}

		return invoke(command, args) as Promise<T>;
	}

	private async loadMetrics(): Promise<void> {
		if (this.metricsBusy || !this.pageVisible) {
			return;
		}
		this.metricsBusy = true;
		try {
			const data = await this.invoke<SystemMetrics>('system_metrics');
			this.zone.run(() => {
				this.metrics.set(data);
				this.loading.set(false);
				this.error.set('');
				this.updatedAt.set(new Date());
				this.recordSample(data);
				this.appendHistory(data);
			});
		} catch (error) {
			this.zone.run(() => {
				this.loading.set(false);
				this.error.set(error instanceof Error ? error.message : String(error));
			});
		} finally {
			this.metricsBusy = false;
		}
	}

	private async loadDetails(): Promise<void> {
		if (this.detailsBusy || !this.pageVisible) {
			return;
		}
		this.detailsBusy = true;
		try {
			const data = await this.invoke<SystemDetails>('system_details');
			this.zone.run(() => {
				this.details.set(data);
				this.detailsLoading.set(false);
			});
		} catch {
			this.zone.run(() => this.detailsLoading.set(false));
		} finally {
			this.detailsBusy = false;
		}
	}

	setRecordMode(label: string): void {
		const index = this.recordModeOptions.indexOf(label);
		this.recordMode.set((['auto', 'before', 'live', 'after'] as const)[index] ?? 'auto');
	}

	resetComparison(): void {
		this.periods.set(emptyPeriods());
		this.savePeriods();
	}

	killProcess(process: ProcessMetric): void {
		if (this.pendingKillPid() !== process.pid) {
			this.pendingKillPid.set(process.pid);
			this.actionError.set('');
			return;
		}
		this.pendingKillPid.set(null);
		this.actionError.set('');
		this.killingPid.set(process.pid);
		this.invoke<void>('kill_process', { pid: process.pid })
			.then(() => this.loadMetrics())
			.catch((error) =>
				this.actionError.set(
					`Не удалось завершить ${process.name}: ${error instanceof Error ? error.message : String(error)}`,
				),
			)
			.finally(() => this.killingPid.set(null));
	}

	coreColor(index: number): string {
		const colors = ['#ff2ea6', '#22e0ff', '#39ff88', '#ffe14d', '#a78bfa', '#fb923c', '#f472b6', '#4ade80'];

		return colors[index % colors.length] ?? '#ff2ea6';
	}

	networkKind(kind: string): string {
		return (
			{
				wifi: 'Wi-Fi',
				ethernet: 'Ethernet',
				loopback: 'Loopback',
				other: 'Другое',
			}[kind] ?? kind
		);
	}

	private refreshStreamStatus(): void {
		this.twitch
			.login()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					const online = Boolean(response.steam?.online);

					if (online !== this.streamOnline()) {
						this.lastLiveAt = Date.now();
					}
					this.zone.run(() => this.streamOnline.set(online));
				},
				error: () => undefined,
			});
	}

	private targetPeriod(): PeriodKey {
		const mode = this.recordMode();

		if (mode !== 'auto') {
			return mode;
		}
		if (this.streamOnline()) {
			return 'live';
		}

		return this.lastLiveAt && Date.now() - this.lastLiveAt < 10 * 60_000 ? 'after' : 'before';
	}

	private recordSample(data: SystemMetrics): void {
		const now = Date.now();
		const previous = this.previous;
		const seconds = previous ? Math.max(0.5, (now - this.previousAt) / 1000) : 1;
		const ram = data.memory_total ? (data.memory_used / data.memory_total) * 100 : 0;
		const vram = data.gpu_memory_total
			? ((data.gpu_memory_used ?? 0) / data.gpu_memory_total) * 100
			: 0;
		const netDown = previous
			? rateMb(data.network_received, previous.network_received, seconds)
			: 0;
		const netUp = previous
			? rateMb(data.network_transmitted, previous.network_transmitted, seconds)
			: 0;
		const diskRead = previous
			? rateMb(sum(data.disks, 'read_bytes'), sum(previous.disks, 'read_bytes'), seconds)
			: 0;
		const diskWrite = previous
			? rateMb(sum(data.disks, 'written_bytes'), sum(previous.disks, 'written_bytes'), seconds)
			: 0;
		const key = this.targetPeriod();
		const current = this.periods()[key];
		const next: PeriodAggregate = {
			samples: current.samples + 1,
			cpuSum: current.cpuSum + data.cpu,
			cpuMax: Math.max(current.cpuMax, data.cpu),
			gpuSum: current.gpuSum + (data.gpu ?? 0),
			gpuMax: Math.max(current.gpuMax, data.gpu ?? 0),
			ramSum: current.ramSum + ram,
			ramMax: Math.max(current.ramMax, ram),
			vramSum: current.vramSum + vram,
			vramMax: Math.max(current.vramMax, vram),
			netDownSum: current.netDownSum + netDown,
			netDownMax: Math.max(current.netDownMax, netDown),
			netUpSum: current.netUpSum + netUp,
			netUpMax: Math.max(current.netUpMax, netUp),
			diskReadMax: Math.max(current.diskReadMax, diskRead),
			diskWriteMax: Math.max(current.diskWriteMax, diskWrite),
			processesSum: current.processesSum + data.processes,
			processesMax: Math.max(current.processesMax, data.processes),
			cpuTempMax:
				data.cpu_temperature == null
					? current.cpuTempMax
					: Math.max(current.cpuTempMax ?? 0, data.cpu_temperature),
			gpuTempMax:
				data.gpu_temperature == null
					? current.gpuTempMax
					: Math.max(current.gpuTempMax ?? 0, data.gpu_temperature),
			lastAt: now,
		};

		this.periods.update((value) => ({ ...value, [key]: next }));
		this.savePeriods();
	}

	private loadPeriods(): Record<PeriodKey, PeriodAggregate> {
		const empty = emptyPeriods();

		try {
			const parsed = JSON.parse(localStorage.getItem(this.storageKey) ?? '{}') as Partial<
				Record<PeriodKey, PeriodAggregate>
			>;

			return {
				before: { ...empty.before, ...parsed.before },
				live: { ...empty.live, ...parsed.live },
				after: { ...empty.after, ...parsed.after },
			};
		} catch {
			return empty;
		}
	}

	private savePeriods(): void {
		try {
			localStorage.setItem(this.storageKey, JSON.stringify(this.periods()));
		} catch {
			// localStorage may be unavailable
		}
	}

	private appendHistory(data: SystemMetrics): void {
		const now = Date.now();
		const previous = this.previous;
		const seconds = previous ? Math.max(0.5, (now - this.previousAt) / 1000) : 1;
		const diskRead = previous
			? rate(sum(data.disks, 'read_bytes'), sum(previous.disks, 'read_bytes'), seconds)
			: 0;
		const diskWrite = previous
			? rate(sum(data.disks, 'written_bytes'), sum(previous.disks, 'written_bytes'), seconds)
			: 0;
		const networkDown = previous
			? rate(data.network_received, previous.network_received, seconds)
			: 0;
		const networkUp = previous
			? rate(data.network_transmitted, previous.network_transmitted, seconds)
			: 0;
		const memory = data.memory_total ? (data.memory_used / data.memory_total) * 100 : 0;

		this.history.update((current) => ({
			cpu: push(current.cpu, data.cpu),
			gpu: push(current.gpu, data.gpu ?? 0),
			memory: push(current.memory, memory),
			networkDown: push(current.networkDown, Math.min(100, networkDown / 1024 / 1024)),
			networkUp: push(current.networkUp, Math.min(100, networkUp / 1024 / 1024)),
			diskRead: push(current.diskRead, Math.min(100, diskRead / 1024 / 1024)),
			diskWrite: push(current.diskWrite, Math.min(100, diskWrite / 1024 / 1024)),
			load: push(current.load, Math.min(100, data.load_one * 10)),
			processes: push(current.processes, Math.min(100, data.processes / 2)),
			vram: push(
				current.vram,
				data.gpu_memory_total ? ((data.gpu_memory_used ?? 0) / data.gpu_memory_total) * 100 : 0,
			),
			cores: data.cpu_cores.map((core, index) =>
				push(current.cores[index] ?? [], core.usage),
			),
		}));
		this.previous = data;
		this.previousAt = now;
	}

	private points(values: number[], key: ChartKey): readonly (readonly [number, number])[] {
		const visible = Math.max(2, Math.round(60 / this.chartZooms()[key]));
		const source = (this.peaksOnly() ? peaks(values) : values).slice(-visible);
		const max = Math.max(1, source.length - 1);

		return source.map(
			(value, index) => [max === 1 ? 0 : (index / max) * this.chartWidth, value] as const,
		);
	}
}

function push(values: number[], value: number): number[] {
	return [...values, value].slice(-60);
}

function peaks(values: number[]): number[] {
	if (values.length < 3) {
		return values;
	}
	const result = [values[0] ?? 0];

	for (let index = 1; index < values.length - 1; index += 1) {
		const value = values[index] ?? 0;
		const previous = values[index - 1] ?? value;
		const next = values[index + 1] ?? value;

		if (value >= previous && value >= next) {
			result.push(value);
		}
	}
	result.push(values.at(-1) ?? 0);

	return result.slice(-30);
}

function sum(disks: DiskMetric[], key: 'read_bytes' | 'written_bytes'): number {
	return disks.reduce((total, disk) => total + disk[key], 0);
}

function rate(current: number, previous: number, seconds: number): number {
	return Math.max(0, (current - previous) / seconds);
}

function rateMb(current: number, previous: number, seconds: number): number {
	return rate(current, previous, seconds) / 1024 / 1024;
}
