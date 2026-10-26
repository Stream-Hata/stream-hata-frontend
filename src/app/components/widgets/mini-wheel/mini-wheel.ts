import { Component, computed, input } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';

@Component({
	imports: [TuiIcon],
	selector: 'app-mini-wheel',
	styleUrl: './mini-wheel.scss',
	templateUrl: './mini-wheel.html',
})
export class MiniWheel {
	readonly accent = input('#FF2EA6');
	readonly variant = input<'roulette' | 'wheel'>('roulette');
	readonly gradient = computed(() => {
		const accent = this.accent();
		const colors = [accent, '#22E0FF', '#FFE14D', '#7C5CFF', '#2EE6A8', '#FF8A3D'];
		const step = 100 / colors.length;
		const stops = colors.map((color, index) => `${color} ${index * step}% ${(index + 1) * step}%`);

		return `conic-gradient(${stops.join(', ')})`;
	});
}
