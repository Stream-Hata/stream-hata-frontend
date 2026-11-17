import { Component } from '@angular/core';
import { Settings } from '../settings/settings';
import { PlatformBar } from './platform-bar/platform-bar';
import { Timer } from './timer/timer';

@Component({
	imports: [PlatformBar, Settings, Timer],
	selector: 'app-hotbar',
	styleUrl: './hotbar.scss',
	templateUrl: './hotbar.html',
})
export class Hotbar {}
