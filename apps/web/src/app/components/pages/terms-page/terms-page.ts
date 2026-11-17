import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

@Component({
	imports: [RouterLink],
	selector: 'app-terms-page',
	template: `
		<div class="public-page">
			<div class="container">
				<header class="public-nav">
					<a class="public-logo" routerLink="/">Nameless StreamHata</a>
					<nav class="public-links">
						<a routerLink="/faq">FAQ</a>
						<a routerLink="/">На главную</a>
					</nav>
				</header>
				<section class="jk-card terms-card">
					<h1 class="jk-h1">Пользовательское соглашение</h1>
					<pre>{{ text() }}</pre>
				</section>
			</div>
		</div>
	`,
	styles: `
		.terms-card {
			max-width: 900px;
			margin: 32px auto;
			padding: 24px;
		}

		pre {
			white-space: pre-wrap;
			color: var(--text-secondary);
			font: var(--font-body-sm);
			line-height: 1.6;
		}
	`,
})
export default class TermsPage {
	private readonly http = inject(HttpClient);
	readonly text = toSignal(
		this.http.get('terms.txt', { responseType: 'text' }).pipe(catchError(() => of('Не удалось загрузить текст соглашения.'))),
		{ initialValue: 'Загружаем…' },
	);
}
