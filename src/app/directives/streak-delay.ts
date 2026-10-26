import type { ChatJuryResult } from '@shared/types/chat-jury';
import {
	ChangeDetectorRef,
	Directive,
	effect,
	inject,
	input,
	TemplateRef,
	ViewContainerRef,
} from '@angular/core';
import { TWITCH_STORE } from '@app/stores/twitch.store';
import { delay, take } from 'rxjs';

interface ChatJuryDelayContext {
	$implicit: ChatJuryResult;
}
@Directive({
	selector: '[appChatJuryDelay]',
})
export class ChatJuryDelayDirective {
	private readonly viewContainerRef = inject(ViewContainerRef);
	private readonly template = inject<TemplateRef<ChatJuryDelayContext>>(TemplateRef);
	private readonly changeDetector = inject(ChangeDetectorRef);
	private readonly store = inject(TWITCH_STORE);

	readonly appChatJuryDelay = input.required<number>();

	constructor() {
		effect(() => {
			this.store
				.getChatJuryResult()
				.pipe(delay(this.appChatJuryDelay() * 1000), take(1))
				.subscribe((data) => {
					this.viewContainerRef.clear();
					const cmp = this.viewContainerRef.createEmbeddedView(this.template, {
						$implicit: data,
					});
					cmp.detectChanges();
				});
		});
	}

	static ngTemplateContextGuard(
		_directive: ChatJuryDelayDirective,
		context: unknown,
	): context is ChatJuryDelayContext {
		return true;
	}
}
