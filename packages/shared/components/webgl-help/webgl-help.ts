import { Component, effect, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiButton, TuiIcon } from '@taiga-ui/core';

@Component({
	imports: [RouterLink, TuiButton, TuiIcon],
	selector: 'app-webgl-help',
	styleUrl: './webgl-help.scss',
	templateUrl: './webgl-help.html',
})
export class WebglHelp {
	readonly autoOpen = input(false);
	readonly closed = output<void>();
	readonly visible = signal(false);
	readonly checked = signal(false);
	readonly supported = signal(false);
	readonly renderer = signal('');

	constructor() {
		effect(() => {
			if (!this.autoOpen()) {
				return;
			}

			try {
				if (localStorage.getItem('nsh.webgl-help-seen') !== '1') {
					this.visible.set(true);
				}
			} catch {
				this.visible.set(true);
			}
		});
	}

	open(): void {
		this.checked.set(false);
		this.visible.set(true);
	}

	close(): void {
		this.visible.set(false);
		try {
			localStorage.setItem('nsh.webgl-help-seen', '1');
		} catch {
			// ignore storage errors
		}
		this.closed.emit();
	}

	check(): void {
		this.checked.set(true);
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('webgl2');

		if (!context) {
			this.supported.set(false);
			this.renderer.set('');

			return;
		}

		this.supported.set(true);
		const debug = context.getExtension('WEBGL_debug_renderer_info');
		const renderer = debug
			? String(context.getParameter(debug.UNMASKED_RENDERER_WEBGL))
			: String(context.getParameter(context.RENDERER));
		this.renderer.set(renderer);
	}
}
