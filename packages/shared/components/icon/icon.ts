import { Component, effect, ElementRef, inject, RendererFactory2, viewChild } from '@angular/core';
import * as feather from 'feather-icons';

@Component({
	selector: 'app-icon',
	styleUrl: './icon.scss',
	templateUrl: './icon.html',
})
export class Icon {
	private readonly renderer = inject(RendererFactory2).createRenderer(null, null);
	readonly content = viewChild.required('text', { read: ElementRef<HTMLElement> });

	constructor() {
		effect(() => {
			const el = this.content().nativeElement;

			this.renderer.setAttribute(el, 'data-feather', el.textContent);

			feather.replace();
		});
	}
}
