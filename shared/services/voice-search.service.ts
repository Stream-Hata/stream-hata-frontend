import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

interface SpeechRecognitionResultLike {
	isFinal: boolean;
	0: { transcript: string };
}

interface SpeechRecognitionEventLike {
	results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	maxAlternatives: number;
	start: () => void;
	stop: () => void;
	onresult: ((event: SpeechRecognitionEventLike) => void) | null;
	onerror: ((event: { error?: string }) => void) | null;
	onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

@Injectable({ providedIn: 'root' })
export class VoiceSearchService {
	readonly listening = signal(false);
	readonly supported = signal(this.constructorFor() !== null);

	private recognition: SpeechRecognitionLike | null = null;

	start(lang = defaultVoiceLanguage()): Observable<string> {
		const Constructor = this.constructorFor();

		return new Observable<string>((subscriber) => {
			if (!Constructor) {
				subscriber.error(new Error('Голосовой поиск не поддерживается этим браузером'));

				return;
			}

			this.stop();
			const recognition = new Constructor();
			this.recognition = recognition;
			recognition.lang = lang;
			recognition.continuous = false;
			recognition.interimResults = false;
			recognition.maxAlternatives = 1;
			recognition.onresult = (event) => {
				const transcript = Array.from(event.results)
					.map((result) => result[0]?.transcript ?? '')
					.join(' ')
					.trim();

				if (transcript) {
					subscriber.next(transcript);
					subscriber.complete();
				}
			};
			recognition.onerror = (event) => {
				subscriber.error(new Error(event.error ?? 'Не удалось распознать речь'));
			};
			recognition.onend = () => {
				this.listening.set(false);
				if (!subscriber.closed) {
					subscriber.complete();
				}
			};

			this.listening.set(true);
			try {
				recognition.start();
			} catch (error) {
				this.listening.set(false);
				subscriber.error(error);
			}

			return () => this.stop();
		});
	}

	stop(): void {
		this.recognition?.stop();
		this.recognition = null;
		this.listening.set(false);
	}

	private constructorFor(): SpeechRecognitionConstructor | null {
		if (typeof window === 'undefined') {
			return null;
		}

		const candidate = window as unknown as {
			SpeechRecognition?: SpeechRecognitionConstructor;
			webkitSpeechRecognition?: SpeechRecognitionConstructor;
		};

		return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
	}
}

function defaultVoiceLanguage(): string {
	if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')) {
		return 'en-US';
	}

	return 'ru-RU';
}
