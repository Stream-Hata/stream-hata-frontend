import type { Renderer2 } from '@angular/core';
import type { Router } from '@angular/router';
import { DOCUMENT, inject, RendererStyleFlags2 } from '@angular/core';
import { NavigationEnd } from '@angular/router';
import { filter, map, tap } from 'rxjs';

/* overlay transparentize helpers */
export function isOverlay(router: Router, renderer: Renderer2, routeName: string) {
	return router.events.pipe(
		filter((event) => event instanceof NavigationEnd),
		map((e) => {
			return e.urlAfterRedirects.includes(routeName);
		}),
		tap((isOverlay) => {
			if (isOverlay) {
				setTransparency(renderer);
			}
		}),
	);
}
function setTransparency(renderer: Renderer2) {
	const doc = inject(DOCUMENT);

	renderer.setStyle(
		doc.documentElement,
		'background-color',
		'transparent',
		RendererStyleFlags2.Important,
	);
	renderer.setStyle(doc.body, 'background-color', 'transparent', RendererStyleFlags2.Important);
	renderer.setProperty(doc.documentElement, '--tui-background-base', 'transparent');
	renderer.setProperty(doc.body, '--tui-background-base', 'transparent');
}
