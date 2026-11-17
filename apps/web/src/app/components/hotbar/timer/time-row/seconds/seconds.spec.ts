import type { ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Seconds } from './seconds';

describe('seconds', () => {
	let component: Seconds;
	let fixture: ComponentFixture<Seconds>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
			imports: [Seconds],
		}).compileComponents();

		fixture = TestBed.createComponent(Seconds);
		component = fixture.componentInstance;
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('renders seconds padded to two digits', () => {
		fixture.componentRef.setInput('seconds', 3);
		fixture.detectChanges();
		expect(fixture.nativeElement.textContent).toContain('03');
	});

	it('renders two-digit seconds as-is', () => {
		fixture.componentRef.setInput('seconds', 45);
		fixture.detectChanges();
		expect(fixture.nativeElement.textContent).toContain('45');
	});
});
