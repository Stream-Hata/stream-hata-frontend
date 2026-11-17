import type { DateTime } from 'luxon';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Hours } from './hours/hours';
import { Minutes } from './minutes/minutes';
import { Seconds } from './seconds/seconds';

@Component({
	imports: [Hours, Minutes, Seconds],
	selector: 'app-time-row',
	styleUrl: './time-row.scss',
	templateUrl: './time-row.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeRow {
	readonly time = input.required<DateTime>();
	readonly mode = input.required<'play' | 'pause'>();
}
