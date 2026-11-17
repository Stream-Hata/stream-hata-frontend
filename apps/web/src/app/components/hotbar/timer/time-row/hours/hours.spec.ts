import type { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Hours } from './hours';

describe('hours', () => {
	let component: Hours;
	let fixture: ComponentFixture<Hours>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
			imports: [Hours],
		}).compileComponents();

		fixture = TestBed.createComponent(Hours);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('renders hours padded to two digits', () => {
		fixture.componentRef.setInput('hours', 5);
		fixture.detectChanges();
		expect(fixture.nativeElement.textContent).toContain('05');
	});

	it('renders two-digit hours as-is', () => {
		fixture.componentRef.setInput('hours', 23);
		fixture.detectChanges();
		expect(fixture.nativeElement.textContent).toContain('23');
	});
});
