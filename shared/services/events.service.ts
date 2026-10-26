import type { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface StreamEvent {
	id: number;
	title: string;
	type: string;
	status: string;
	startsAt?: string;
	createdAt: string;
}

export interface CreateStreamEvent {
	title: string;
	type: string;
	startsAt?: string;
}

@Injectable({ providedIn: 'root' })
export class StreamEventsService {
	private readonly http = inject(HttpClient);

	list(): Observable<{ events: StreamEvent[] }> {
		return this.http.get<{ events: StreamEvent[] }>('rgg-sync/events');
	}

	create(event: CreateStreamEvent): Observable<StreamEvent> {
		return this.http.post<StreamEvent>('rgg-sync/events', event);
	}

	updateStatus(id: number, status: string): Observable<StreamEvent> {
		return this.http.patch<StreamEvent>(`rgg-sync/events/${id}`, { status });
	}

	remove(id: number): Observable<{ ok: boolean }> {
		return this.http.delete<{ ok: boolean }>(`rgg-sync/events/${id}`);
	}
}
