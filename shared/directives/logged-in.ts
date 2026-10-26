import { Directive, inject, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({
	selector: '[appLoggedIn]',
})
export class LoggedIn<T> {
	private readonly container = inject(ViewContainerRef);
	private readonly templateRef = inject<TemplateRef<T>>(TemplateRef);

	constructor() {}
}
