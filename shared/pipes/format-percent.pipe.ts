import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

@Pipe({ name: 'formatPercent' })
export class FormatPercentPipe implements PipeTransform {
	transform(value: number | null | undefined, total: number | null | undefined = 100): string {
		if (value == null || !total) {
			return '0%';
		}

		return `${Math.max(0, Math.min(100, (value / total) * 100)).toFixed(0)}%`;
	}
}
