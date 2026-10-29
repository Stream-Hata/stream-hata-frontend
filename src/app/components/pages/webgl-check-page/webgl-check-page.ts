import { Component, signal } from '@angular/core';
import { TuiButton, TuiIcon } from '@taiga-ui/core';

@Component({
	imports: [TuiButton, TuiIcon],
	selector: 'app-webgl-check-page',
	styleUrl: './webgl-check-page.scss',
	templateUrl: './webgl-check-page.html',
})
export default class WebglCheckPage {
	readonly location = location.href;
	readonly checked = signal(false);
	readonly supported = signal(false);
	readonly renderer = signal('');
	readonly vendor = signal('');
	readonly size = signal('');

	constructor() {
		this.check();
	}

	check(): void {
		this.checked.set(true);
		const canvas = document.createElement('canvas');
		canvas.width = 320;
		canvas.height = 180;
		const context = canvas.getContext('webgl2');

		if (!context) {
			this.supported.set(false);

			return;
		}

		this.supported.set(true);
		const debug = context.getExtension('WEBGL_debug_renderer_info');
		this.renderer.set(
			debug ? String(context.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : String(context.getParameter(context.RENDERER)),
		);
		this.vendor.set(
			debug ? String(context.getParameter(debug.UNMASKED_VENDOR_WEBGL)) : String(context.getParameter(context.VENDOR)),
		);
		this.size.set(`${canvas.width}×${canvas.height}`);
	}

	copyLink(): void {
		void navigator.clipboard?.writeText(location.href);
	}
}
