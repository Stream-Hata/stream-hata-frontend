import type { DisplayMessage } from '../messages-page.types';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TuiMedia } from '@taiga-ui/cdk';
import { TuiIcon } from '@taiga-ui/core';
import { fileNameFromUrl, formatTime } from '../messages-page.utils';

@Component({
	imports: [TuiIcon, TuiMedia],
	selector: 'app-message-bubble',
	styleUrl: './message-bubble.scss',
	templateUrl: './message-bubble.html',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageBubble {
	readonly message = input.required<DisplayMessage>();
	readonly openMenu = output<MouseEvent>();
	readonly openLink = output<{ event: Event; url: string; encrypted: boolean }>();
	readonly react = output<{ message: DisplayMessage; emoji: string }>();

	readonly fileNameFromUrl = fileNameFromUrl;
	readonly formatTime = formatTime;

	link(event: Event, url: string): void {
		event.preventDefault();
		this.openLink.emit({ event, url, encrypted: this.message().encrypted });
	}

	reactTo(emoji: string): void {
		this.react.emit({ message: this.message(), emoji });
	}
}
