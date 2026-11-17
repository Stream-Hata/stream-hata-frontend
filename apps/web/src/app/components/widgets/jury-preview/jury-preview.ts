import { Component, input } from '@angular/core';

@Component({
	selector: 'app-jury-preview',
	styleUrl: './jury-preview.scss',
	templateUrl: './jury-preview.html',
})
export class JuryPreview {
	readonly compact = input(false);
}
