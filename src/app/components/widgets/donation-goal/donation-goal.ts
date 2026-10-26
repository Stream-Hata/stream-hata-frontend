import type { DonationGoal, DonationWidgetConfig } from '@shared/types/donation';
import { DecimalPipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';

@Component({
	imports: [DecimalPipe],
	selector: 'app-donation-goal',
	styleUrl: './donation-goal.scss',
	templateUrl: './donation-goal.html',
})
export class DonationGoalBar {
	readonly goal = input.required<DonationGoal>();
	readonly config = input.required<DonationWidgetConfig>();
	readonly progress = computed(() => {
		const goal = this.goal();
		const start = goal.startAmount || 0;
		const target = goal.goalAmount || 0;
		const current = goal.raisedAmount || 0;

		if (target <= start) {
			return current > 0 ? 100 : 0;
		}

		return Math.max(0, Math.min(100, ((current - start) / (target - start)) * 100));
	});
	readonly remaining = computed(() => Math.max(0, this.goal().goalAmount - this.goal().raisedAmount));
	readonly style = computed(() => ({
		'--goal-width': `${this.config().goalWidth}px`,
		'--goal-bg': this.config().goalBackground,
		'--goal-accent': this.config().goalAccent,
		'--goal-text': this.config().goalTextColor,
	}));
}
