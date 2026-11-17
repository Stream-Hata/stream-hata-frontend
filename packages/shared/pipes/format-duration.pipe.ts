import type { PipeTransform } from '@angular/core';
import { Pipe } from '@angular/core';

@Pipe({ name: 'formatDuration' })
export class FormatDurationPipe implements PipeTransform {
	transform(value: number | null | undefined): string {
		if (!value || value < 0) {
			return '0:00';
		}

		const seconds = Math.floor(value);
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const rest = seconds % 60;

		return hours > 0
			? `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
			: `${minutes}:${String(rest).padStart(2, '0')}`;
	}
}
