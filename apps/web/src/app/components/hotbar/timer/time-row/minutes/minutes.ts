import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
	imports: [DecimalPipe],
	selector: 'app-minutes',
	styleUrl: './minutes.scss',
	templateUrl: './minutes.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Minutes {
	readonly minutes = input.required<number>();
}
