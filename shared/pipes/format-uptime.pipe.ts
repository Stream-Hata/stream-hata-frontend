import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

@Pipe({ name: 'formatUptime' })
export class FormatUptimePipe implements PipeTransform {
	transform(value: number | null | undefined): string {
		if (!value || value < 0) {
			return '—';
		}

		const days = Math.floor(value / 86400);
		const hours = Math.floor((value % 86400) / 3600);
		const minutes = Math.floor((value % 3600) / 60);

		return `${days ? `${days} д ` : ''}${hours} ч ${minutes} мин`;
	}
}
