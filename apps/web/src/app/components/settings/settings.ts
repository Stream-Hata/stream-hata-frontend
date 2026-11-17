import { Component, signal } from '@angular/core';
import { TuiButton, TuiDropdownDirective, TuiDropdownOpen } from '@taiga-ui/core';
import { SettingsDropdown } from './settings-dropdown/settings-dropdown';

@Component({
	imports: [TuiButton, TuiDropdownDirective, TuiDropdownOpen, SettingsDropdown],
	selector: 'app-settings',
	styleUrl: './settings.scss',
	templateUrl: './settings.html',
})
export class Settings {
	readonly open = signal(false);
}
