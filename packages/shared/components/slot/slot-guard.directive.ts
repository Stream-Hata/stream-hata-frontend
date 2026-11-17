import type { PlatformInfo } from '../../types/hotbar-state';
import { Directive, inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';

interface SlotContext<T> {
	$implicit: T;
}

@Directive({
	selector: '[appPlatformGuard]',
})
export class PlatformGuardDirective<T> {
	private readonly templateRef = inject(TemplateRef);
	private readonly viewContainer = inject(ViewContainerRef);

	// eslint-disable-next-line accessor-pairs
	@Input({
		required: true,
	})
	set appPlatformGuard(value: T) {
		this.viewContainer.clear();
		this.viewContainer.createEmbeddedView(this.templateRef, {
			$implicit: value,
		});
	}

	static ngTemplateContextGuard(
		dir: PlatformGuardDirective<PlatformInfo>,
		_ctx: unknown,
	): _ctx is SlotContext<PlatformInfo> {
		return true;
	}
}
