import type { HttpErrorResponse } from '@angular/common/http';
import type { MusicListResponse } from '@shared/types/music';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { saveTextFile } from '@shared/helpers/save-file';
import { MusicService } from '@shared/services/music.service';
import {
	TuiTable,
	TuiTableTbody,
	TuiTableTd,
	TuiTableTh,
	TuiTableThead,
} from '@taiga-ui/addon-table';
import { TuiButton, TuiIcon, TuiInput, TuiTextfield } from '@taiga-ui/core';
import { catchError, firstValueFrom, merge, of, switchMap, timer } from 'rxjs';

const EMPTY: MusicListResponse = {
	tracks: [],
	stats: { totalTracks: 0, totalDurationSeconds: 0, uniqueAuthors: 0 },
	enabled: true,
};

@Component({
	imports: [
		TuiButton,
		TuiIcon,
		TuiInput,
		TuiTable,
		TuiTableTbody,
		TuiTableTd,
		TuiTableTh,
		TuiTableThead,
		TuiTextfield,
	],
	selector: 'app-music-page',
	styleUrl: './music-page.scss',
	templateUrl: './music-page.html',
})
export default class MusicPage {
	private readonly service = inject(MusicService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly refresh = signal(0);

	readonly link = signal('');
	readonly adding = signal(false);
	readonly error = signal<string | null>(null);
	readonly telegramSent = signal(false);

	readonly tracks = computed(() => {
		const today = new Date().toLocaleDateString('en-CA');

		return this.data().tracks.filter(
			(track) => new Date(track.lastAddedAt).toLocaleDateString('en-CA') === today,
		);
	});

	readonly data = toSignal(
		merge(timer(0, 7000), toObservable(this.refresh)).pipe(
			switchMap(() => this.service.list().pipe(catchError(() => of(EMPTY)))),
		),
		{ initialValue: EMPTY },
	);

	async exportCsv(): Promise<void> {
		const text = await firstValueFrom(this.service.exportCsv().pipe(catchError(() => of(''))));

		if (text) {
			await saveTextFile('streamhata-music.csv', text, 'text/csv');
		}
	}

	get statsLine(): string {
		const stats = this.data().stats;
		const duration = this.formatDuration(stats.totalDurationSeconds);

		return `${stats.totalTracks} треков · ${duration} · ${stats.uniqueAuthors} исполнителей`;
	}

	addTrack(): void {
		const url = this.link().trim();

		if (!url || this.adding()) {
			return;
		}

		this.adding.set(true);
		this.error.set(null);

		this.service.add(url, 'panel').subscribe({
			next: () => {
				this.link.set('');
				this.adding.set(false);
				this.refresh.update((value) => value + 1);
			},
			error: (response: HttpErrorResponse) => {
				this.adding.set(false);
				this.error.set(
					typeof response.error?.error === 'string'
						? response.error.error
						: 'Не удалось получить данные трека',
				);
			},
		});
	}

	sendToTelegram(): void {
		this.service.exportToTelegram().subscribe({
			next: () => {
				this.telegramSent.set(true);

				timer(1500)
					.pipe(takeUntilDestroyed(this.destroyRef))
					.subscribe(() => this.telegramSent.set(false));
			},
			error: (response: HttpErrorResponse) => {
				this.error.set(
					typeof response.error?.error === 'string'
						? response.error.error
						: 'Не удалось отправить трек-лист в Telegram',
				);
			},
		});
	}

	remove(videoId: string): void {
		this.service.remove(videoId).subscribe({
			next: () => this.refresh.update((value) => value + 1),
		});
	}

	formatDuration(seconds: number): string {
		if (!seconds) {
			return '—';
		}

		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const rest = seconds % 60;

		if (hours > 0) {
			return `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
		}

		return `${minutes}:${String(rest).padStart(2, '0')}`;
	}

	formatDate(value: string): string {
		const date = new Date(value);

		return Number.isNaN(date.getTime())
			? '—'
			: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
	}
}
