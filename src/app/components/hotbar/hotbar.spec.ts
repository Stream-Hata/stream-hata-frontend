import type { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Hotbar } from './hotbar';

describe('hotbar', () => {
	let component: Hotbar;
	let fixture: ComponentFixture<Hotbar>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
			imports: [Hotbar],
		}).compileComponents();

		fixture = TestBed.createComponent(Hotbar);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
