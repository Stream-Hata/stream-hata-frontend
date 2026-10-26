import type { ChatJuryPublic } from '@shared/types/chat-jury';
import { Component, input } from '@angular/core';

@Component({
	selector: 'app-interaction',
	styleUrl: './interaction.scss',
	templateUrl: './interaction.html',
})
export class Interaction {
	readonly chatJury = input.required<ChatJuryPublic>();
}
