import { effect, Injectable, signal } from '@angular/core';

export type SystemAlertRuleId =
	| 'cpuTemp'
	| 'gpuTemp'
	| 'fan'
	| 'ram'
	| 'vram'
	| 'disk'
	| 'battery'
	| 'voltage'
	| 'processes';

export interface SystemAlertRule {
	id: SystemAlertRuleId;
	label: string;
	enabled: boolean;
	threshold: number;
	unit: string;
	compare: 'gte' | 'lte';
	message: string;
}

const STORAGE_KEY = 'nsh.system-alerts';

const DEFAULTS: SystemAlertRule[] = [
	{
		id: 'cpuTemp',
		label: 'Температура CPU',
		enabled: true,
		threshold: 85,
		unit: '°C',
		compare: 'gte',
		message:
			'Диспетчерская: двигатель CPU нагрелся до {value}. Разрешите снижение нагрузки и выпустите вентиляторы на взлётную полосу.',
	},
	{
		id: 'gpuTemp',
		label: 'Температура GPU',
		enabled: true,
		threshold: 85,
		unit: '°C',
		compare: 'gte',
		message:
			'Борт {value}: GPU передаёт сигнал перегрева. Пассажирам-шейдерам рекомендуется временно пристегнуться.',
	},
	{
		id: 'fan',
		label: 'Обороты вентиляторов',
		enabled: true,
		threshold: 4500,
		unit: 'RPM',
		compare: 'gte',
		message:
			'Турбина раскрутилась до {value}. Если это не взлёт, проверьте, не привязали ли вы кулер к потолку.',
	},
	{
		id: 'ram',
		label: 'Заполнение RAM',
		enabled: true,
		threshold: 92,
		unit: '%',
		compare: 'gte',
		message:
			'Салон переполнен: пассажиры-вкладки заняли {value} кресел. Багаж отказывается помещаться в оверлей.',
	},
	{
		id: 'vram',
		label: 'Заполнение VRAM',
		enabled: true,
		threshold: 92,
		unit: '%',
		compare: 'gte',
		message:
			'Багажный отсек VRAM загружен на {value}. Текстуры требуют дополнительный рейс до дисковой полосы.',
	},
	{
		id: 'disk',
		label: 'Заполнение диска',
		enabled: true,
		threshold: 95,
		unit: '%',
		compare: 'gte',
		message:
			'Полоса почти закончилась: {value} ВПП занято. Освободите место, иначе шасси будут выпускаться в никуда.',
	},
	{
		id: 'battery',
		label: 'Батарея',
		enabled: true,
		threshold: 15,
		unit: '%',
		compare: 'lte',
		message:
			'Топливный бак на исходе: осталось {value}. Найдите розетку или объявите аварийную посадку.',
	},
	{
		id: 'voltage',
		label: 'Напряжение 12V',
		enabled: true,
		threshold: 13.5,
		unit: 'V',
		compare: 'gte',
		message:
			'Бортовая сеть выдаёт {value}. Инженеры просят не включать кофеварку на взлётной полосе.',
	},
	{
		id: 'processes',
		label: 'Количество процессов',
		enabled: true,
		threshold: 500,
		unit: 'шт.',
		compare: 'gte',
		message:
			'Авиадиспетчерская перегружена: {value} бортов одновременно запрашивают посадку. Часть рейсов задержана.',
	},
];

@Injectable({ providedIn: 'root' })
export class SystemAlertSettingsService {
	readonly enabled = signal(true);
	readonly rules = signal<SystemAlertRule[]>(DEFAULTS.map((rule) => ({ ...rule })));

	constructor() {
		this.restore();
		effect(() => {
			const value = { enabled: this.enabled(), rules: this.rules() };

			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
			} catch {
				// storage unavailable
			}
		});
	}

	update(id: SystemAlertRuleId, patch: Partial<SystemAlertRule>): void {
		this.rules.update((rules) =>
			rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)),
		);
	}

	reset(): void {
		this.enabled.set(true);
		this.rules.set(DEFAULTS.map((rule) => ({ ...rule })));
	}

	private restore(): void {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);

			if (!raw) {
				return;
			}
			const parsed = JSON.parse(raw) as {
				enabled?: boolean;
				rules?: SystemAlertRule[];
			};

			this.enabled.set(parsed.enabled ?? true);
			if (Array.isArray(parsed.rules)) {
				this.rules.set(
					DEFAULTS.map((defaults) => {
						const saved = parsed.rules?.find((rule) => rule.id === defaults.id);

						return saved ? { ...defaults, ...saved } : { ...defaults };
					}),
				);
			}
		} catch {
			// ignore broken storage
		}
	}
}
