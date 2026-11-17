import { Component, computed, input } from '@angular/core';

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

@Component({
	selector: 'app-approval-ring',
	styleUrl: './approval-ring.scss',
	templateUrl: './approval-ring.html',
})
export class ApprovalRing {
	readonly value = input(72);
	readonly size = input(96);
	readonly label = input('одобрение');
	readonly stroke = input(4);
	readonly circumference = CIRCUMFERENCE;
	readonly offset = computed(
		() => CIRCUMFERENCE * (1 - Math.min(Math.max(this.value(), 0), 100) / 100),
	);
}
