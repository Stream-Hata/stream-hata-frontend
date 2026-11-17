import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DOWNLOAD_URL, TWITCH_CHANNEL_URL } from '@shared/config';
import { TuiButton, TuiIcon, TuiLink } from '@taiga-ui/core';
import { Logo } from '../../ui/logo/logo';
import { AlertPreview } from '../../widgets/alert-preview/alert-preview';
import { JuryPreview } from '../../widgets/jury-preview/jury-preview';
import { TimerPreview } from '../../widgets/timer-preview/timer-preview';

@Component({
	imports: [RouterLink, TuiButton, TuiIcon, TuiLink, AlertPreview, JuryPreview, Logo, TimerPreview],
	selector: 'app-landing-page',
	styleUrl: './landing-page.scss',
	templateUrl: './landing-page.html',
})
export default class LandingPage {
	readonly downloadUrl = DOWNLOAD_URL;
	readonly twitchUrl = TWITCH_CHANNEL_URL;
}
