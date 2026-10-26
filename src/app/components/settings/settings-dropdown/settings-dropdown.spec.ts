import type { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SettingsDropdown } from './settings-dropdown';

describe('settingsDropdown', () => {
	let component: SettingsDropdown;
	let fixture: ComponentFixture<SettingsDropdown>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
			imports: [SettingsDropdown],
		}).compileComponents();

		fixture = TestBed.createComponent(SettingsDropdown);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
