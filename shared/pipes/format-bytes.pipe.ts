import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

@Pipe({ name: 'formatBytes' })
export class FormatBytesPipe implements PipeTransform {
	transform(value: number | null | undefined): string {
		if (!value || value < 0) {
			return '0 B';
		}

		const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
		const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));

		return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
	}
}
