import { Component, input } from '@angular/core';
import { PlatformGuardDirective } from './slot-guard.directive';

@Component({
	imports: [PlatformGuardDirective],
	selector: 'app-slot',
	styleUrl: './slot.scss',
	templateUrl: './slot.html',
})
export class Slot<T> {
	readonly data = input.required<T>();
}
