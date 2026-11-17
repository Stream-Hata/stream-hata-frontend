import type { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface LotCompletion {
	hastilyHours?: number;
	normallyHours?: number;
	completelyHours?: number;
}

export interface LotMeta {
	type: string;
	title: string;
	subtitle: string;
	year: number;
	genre: string;
	description: string;
	image: string;
	url: string;
	source: string;
	dlc?: string[];
	editions?: string[];
	mods?: string[];
	modsUrl?: string;
	platforms?: string[];
	rating?: number;
	aggregatedRating?: number;
	completion?: LotCompletion;
	originalTitle?: string;
	developers?: string[];
	publishers?: string[];
	themes?: string[];
	gameModes?: string[];
	perspectives?: string[];
	releaseDate?: string;
	website?: string;
	storyline?: string;
	runtimeMinutes?: number;
	artist?: string;
	album?: string;
	durationSeconds?: number;
}

@Injectable({ providedIn: 'root' })
export class LotsService {
	private readonly http = inject(HttpClient);

	parse(name: string, type: string, lang: string): Observable<LotMeta> {
		return this.http.get<LotMeta>('rgg-sync/lots/meta', { params: { name, type, lang } });
	}
}
