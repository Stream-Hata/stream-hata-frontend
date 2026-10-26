export interface SystemWidgetConfig {
	cpu: boolean;
	gpu: boolean;
	memory: boolean;
	network: boolean;
	processes: boolean;
	disks: boolean;
	interval: number;
}

export const SYSTEM_WIDGET_DEFAULT: SystemWidgetConfig = {
	cpu: true,
	gpu: true,
	memory: true,
	network: true,
	processes: true,
	disks: true,
	interval: 2,
};

const STORAGE_KEY = 'streamhata.system-widget';

export function loadSystemWidgetConfig(): SystemWidgetConfig {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<SystemWidgetConfig>;

		return { ...SYSTEM_WIDGET_DEFAULT, ...stored };
	} catch {
		return { ...SYSTEM_WIDGET_DEFAULT };
	}
}

export function saveSystemWidgetConfig(config: SystemWidgetConfig): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function systemWidgetUrl(config = loadSystemWidgetConfig()): string {
	const params = new URLSearchParams({
		cpu: config.cpu ? '1' : '0',
		gpu: config.gpu ? '1' : '0',
		memory: config.memory ? '1' : '0',
		network: config.network ? '1' : '0',
		processes: config.processes ? '1' : '0',
		disks: config.disks ? '1' : '0',
		interval: String(config.interval),
	});

	return `http://127.0.0.1:17890/?${params}`;
}
