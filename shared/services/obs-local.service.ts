import type { ObsStatus } from '@shared/types/stream';
import { Injectable } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';

interface ObsMessage {
	op: number;
	d?: Record<string, unknown>;
}

interface ObsResponse {
	requestId?: string;
	requestStatus?: { result?: boolean; comment?: string };
	responseData?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class ObsLocalService {
	private readonly tauriInvoke: ((command: string, args?: Record<string, unknown>) => Promise<unknown>) | undefined = undefined;
	private socket: WebSocket | null = null;
	private identified = false;
	private url = 'ws://127.0.0.1:4455';
	private password = '';
	private requestId = 0;
	private pending = new Map<string, { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void }>();

	connect(url: string, password: string): Observable<ObsStatus> {
		if (this.tauriInvoke) {
			this.url = url;
			this.password = password;

			return from(
				this.tauriInvoke('obs_connect', { url, password }).then((status) => status as ObsStatus),
			);
		}

		this.close();
		this.url = url;
		this.password = password;

		return new Observable<ObsStatus>((observer) => {
			const socket = new WebSocket(url);
			this.socket = socket;

			socket.onmessage = (event) => void this.handleMessage(event.data);
			socket.onerror = () => {
				observer.error(new Error('Не удалось подключиться к OBS WebSocket'));
			};
			socket.onclose = () => {
				this.identified = false;
			};

			const timer = setInterval(() => {
				if (!this.identified) {
					return;
				}

				clearInterval(timer);
				this.status().subscribe({
					next: (status) => {
						observer.next(status);
						observer.complete();
					},
					error: (error) => observer.error(error),
				});
			}, 50);

			return () => {
				clearInterval(timer);
				if (!this.identified) {
					this.close();
				}
			};
		});
	}

	status(): Observable<ObsStatus> {
		if (this.tauriInvoke) {
			return from(this.tauriInvoke('obs_status').then((status) => status as ObsStatus));
		}

		if (!this.identified) {
			return of(this.offline());
		}

		return from(this.readStatus());
	}

	disconnect(): Observable<ObsStatus> {
		if (this.tauriInvoke) {
			return from(this.tauriInvoke('obs_disconnect').then(() => this.offline()));
		}

		this.close();

		return of(this.offline());
	}

	scene(scene: string): Observable<unknown> {
		if (this.tauriInvoke) {
			return from(this.tauriInvoke('obs_scene', { scene }));
		}

		return from(this.request('SetCurrentProgramScene', { sceneName: scene }));
	}

	mute(input: string): Observable<{ muted: boolean }> {
		if (this.tauriInvoke) {
			return from(this.tauriInvoke('obs_mute', { input }).then((result) => result as { muted: boolean }));
		}

		return from(
			this.request('GetInputMute', { inputName: input }).then((data) => {
				const muted = !Boolean(data['inputMuted']);

				return this.request('SetInputMute', { inputName: input, inputMuted: muted }).then(() => ({ muted }));
			}),
		);
	}

	output(output: string, action: string): Observable<unknown> {
		if (this.tauriInvoke) {
			return from(this.tauriInvoke('obs_output', { output, action }));
		}

		const requestType =
			output === 'stream'
				? action === 'stop'
					? 'StopStream'
					: 'StartStream'
				: output === 'record'
					? action === 'stop'
						? 'StopRecord'
						: 'StartRecord'
					: 'SaveReplayBuffer';

		return from(this.request(requestType, {}));
	}

	private async handleMessage(raw: unknown): Promise<void> {
		const message = JSON.parse(String(raw)) as ObsMessage;

		if (message.op === 0) {
			const auth = message.d?.['authentication'] as
				| { challenge?: string; salt?: string }
				| undefined;
			const identify: Record<string, unknown> = { rpcVersion: 1 };

			if (auth?.challenge && auth.salt) {
				identify['authentication'] = await this.auth(auth.salt, auth.challenge);
			}

			this.send({ op: 1, d: identify });

			return;
		}

		if (message.op === 2) {
			this.identified = true;

			return;
		}

		if (message.op !== 7) {
			return;
		}

		const response = message.d as unknown as ObsResponse;
		const pending = response.requestId ? this.pending.get(response.requestId) : undefined;

		if (!pending) {
			return;
		}

		this.pending.delete(response.requestId!);

		if (response.requestStatus?.result === false) {
			pending.reject(new Error(response.requestStatus.comment ?? 'OBS request failed'));

			return;
		}

		pending.resolve(response.responseData ?? {});
	}

	private async readStatus(): Promise<ObsStatus> {
		const [sceneList, inputList, stream, record] = await Promise.all([
			this.request('GetSceneList', {}),
			this.request('GetInputList', {}),
			this.request('GetStreamStatus', {}),
			this.request('GetRecordStatus', {}),
		]);
		const scenes = (sceneList['scenes'] as Array<{ sceneName?: string }> | undefined) ?? [];
		const inputs = (inputList['inputs'] as Array<{ inputName?: string }> | undefined) ?? [];

		return {
			connected: true,
			url: this.url,
			scenes: scenes.map((scene) => scene.sceneName ?? '').filter(Boolean),
			currentScene: String(sceneList['currentProgramSceneName'] ?? ''),
			inputs: inputs.map((input) => input.inputName ?? '').filter(Boolean),
			streaming: Boolean(stream['outputActive']),
			recording: Boolean(record['outputActive']),
		};
	}

	private request(type: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
		if (!this.socket || !this.identified) {
			return Promise.reject(new Error('OBS WebSocket не подключён'));
		}

		const requestId = String(++this.requestId);

		return new Promise((resolve, reject) => {
			this.pending.set(requestId, { resolve, reject });
			this.send({ op: 6, d: { requestType: type, requestId, requestData: data } });
		});
	}

	private send(message: ObsMessage): void {
		this.socket?.send(JSON.stringify(message));
	}

	private close(): void {
		this.socket?.close();
		this.socket = null;
		this.identified = false;

		for (const pending of this.pending.values()) {
			pending.reject(new Error('OBS WebSocket отключён'));
		}

		this.pending.clear();
	}

	private auth(salt: string, challenge: string): Promise<string> {
		const value = new TextEncoder().encode(this.password + salt + challenge);

		return crypto.subtle.digest('SHA-256', value).then((hash) =>
			btoa(String.fromCharCode(...new Uint8Array(hash))),
		);
	}

	private offline(): ObsStatus {
		return {
			connected: false,
			url: this.url,
			scenes: [],
			currentScene: '',
			inputs: [],
			streaming: false,
			recording: false,
		};
	}
}
