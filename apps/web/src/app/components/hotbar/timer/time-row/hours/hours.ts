import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
	imports: [DecimalPipe],
	selector: 'app-hours',
	styleUrl: './hours.scss',
	templateUrl: './hours.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hours {
	readonly hours = input.required<number>();
}
