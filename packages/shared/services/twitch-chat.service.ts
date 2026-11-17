import { Injectable, signal } from '@angular/core';

export interface TwitchChatLine {
	id: string;
	user: string;
	text: string;
	color: string;
}

@Injectable({ providedIn: 'root' })
export class TwitchChatSocketService {
	readonly messages = signal<TwitchChatLine[]>([]);
	readonly connected = signal(false);
	readonly channel = signal('');
	private socket: WebSocket | null = null;
	private counter = 0;

	connect(channel: string): void {
		const login = channel.trim().toLowerCase().replace(/^#/, '');
		if (!login) {
			return;
		}
		this.disconnect();
		this.channel.set(login);
		this.messages.set([]);
		const socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
		this.socket = socket;
		socket.onopen = () => {
			socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
			socket.send(`NICK justinfan${Math.floor(Math.random() * 90000) + 10000}`);
			socket.send(`JOIN #${login}`);
			this.connected.set(true);
		};
		socket.onmessage = (event) => this.receive(String(event.data));
		socket.onclose = () => this.connected.set(false);
		socket.onerror = () => this.connected.set(false);
	}

	disconnect(): void {
		this.socket?.close();
		this.socket = null;
		this.connected.set(false);
	}

	private receive(raw: string): void {
		for (const line of raw.split('\r\n')) {
			if (!line) continue;
			if (line.startsWith('PING')) {
				this.socket?.send('PONG :tmi.twitch.tv');
				continue;
			}
			if (!line.includes(' PRIVMSG ')) continue;
			const tags = line.startsWith('@') ? line.slice(1, line.indexOf(' ')) : '';
			const message = line.slice(line.indexOf(' PRIVMSG '));
			const user = /^:([^!]+)!/.exec(line)?.[1] ?? 'viewer';
			const text = message.slice(message.indexOf(' :') + 2);
			const display = /display-name=([^;]*)/.exec(tags)?.[1] || user;
			const color = /color=(#[0-9a-fA-F]{6})/.exec(tags)?.[1] || '';
			const id = /(?:^|;)id=([^;]*)/.exec(tags)?.[1] || `${Date.now()}-${this.counter++}`;

			this.messages.update((items) => [...items.slice(-99), { id, user: display, text, color }]);
		}
	}
}
