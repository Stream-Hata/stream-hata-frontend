import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
	imports: [DecimalPipe],
	selector: 'app-seconds',
	styleUrl: './seconds.scss',
	templateUrl: './seconds.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Seconds {
	readonly seconds = input.required<number>();
}
