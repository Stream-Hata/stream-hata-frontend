import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { catchError, of } from 'rxjs';
import { Logo } from '../../ui/logo/logo';

interface ChangelogItem {
	text: string;
	linkLabel?: string;
	url?: string;
}

interface ChangelogSection {
	title: string;
	items: ChangelogItem[];
}

interface ChangelogVersion {
	version: string;
	date: string;
	sections: ChangelogSection[];
}

@Component({
	imports: [Logo, RouterLink, TuiIcon],
	selector: 'app-changelog-page',
	styleUrl: './changelog-page.scss',
	templateUrl: './changelog-page.html',
})
export default class ChangelogPage {
	private readonly http = inject(HttpClient);
	readonly versions = toSignal(
		this.http.get<ChangelogVersion[]>('changelog.json').pipe(catchError(() => of([]))),
		{ initialValue: [] as ChangelogVersion[] },
	);
}
