import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TWITCH_STORE } from '@app/stores/twitch.store';
import { ChatJuryDelayDirective } from '../../directives/streak-delay';
import { Interaction } from './interaction/interaction';
import { Result } from './result/result';

@Component({
	imports: [ChatJuryDelayDirective, Interaction, Result],
	selector: 'app-chat-jury',
	styleUrl: './chat-jury.scss',
	templateUrl: './chat-jury.html',
})
export class ChatJury {
	private readonly store = inject(TWITCH_STORE);
	private readonly destroyRef = inject(DestroyRef);

	readonly chatJury = this.store.chatJury();

	constructor() {
		this.store.getCurrentChatJury().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
	}
}
