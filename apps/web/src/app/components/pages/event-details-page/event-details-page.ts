import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiButton, TuiIcon } from '@taiga-ui/core';

@Component({
	imports: [RouterLink, TuiButton, TuiIcon],
	selector: 'app-event-details-page',
	styleUrl: './event-details-page.scss',
	templateUrl: './event-details-page.html',
})
export default class EventDetailsPage {}
