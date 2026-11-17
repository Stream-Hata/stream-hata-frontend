import type { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PlatformBar } from './platform-bar';

describe('platformBar', () => {
	let component: PlatformBar;
	let fixture: ComponentFixture<PlatformBar>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
			imports: [PlatformBar],
		}).compileComponents();

		fixture = TestBed.createComponent(PlatformBar);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
